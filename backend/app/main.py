from __future__ import annotations

import json
import logging
import re
import sqlite3
from collections import defaultdict
from typing import Any, Dict, Iterable, List, Optional, Type, TypeVar

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import schemas
from .database import execute, fetch_all, fetch_one, get_connection

EquipmentModel = TypeVar("EquipmentModel", bound=BaseModel)

SPELL_SCHOOL_KEYWORDS: tuple[tuple[str, str], ...] = (
    ("abjuration", "Abjuration"),
    ("conjuration", "Conjuration"),
    ("divination", "Divination"),
    ("enchantment", "Enchantment"),
    ("evocation", "Evocation"),
    ("illusion", "Illusion"),
    ("necromancy", "Necromancy"),
    ("transmutation", "Transmutation"),
)

SPELL_SCHOOL_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = tuple(
    (re.compile(rf"\b{re.escape(keyword)}\b", re.IGNORECASE), canonical)
    for keyword, canonical in SPELL_SCHOOL_KEYWORDS
)

app = FastAPI(title="Baldur's Gate 3 Companion API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _boolify(row: Dict, *fields: str) -> Dict:
    for field in fields:
        if field in row:
            row[field] = bool(row[field])
    return row


def _normalize_skill_choices(choices: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for choice in choices:
        text = str(choice).strip()
        if not text:
            continue
        key = text.casefold()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(text)
    return normalized


def _serialize_skill_choices(choices: Iterable[str]) -> str:
    return json.dumps(_normalize_skill_choices(choices), ensure_ascii=False)


def _deserialize_skill_choices(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, str):
        try:
            data = json.loads(value)
        except json.JSONDecodeError:
            return _normalize_skill_choices(value.split(","))
    else:
        data = value
    if isinstance(data, list):
        return _normalize_skill_choices(data)
    return []


def _load_build(build_id: int) -> schemas.Build:
    build_row = fetch_one(
        "companion",
        "SELECT id, name, race, class, subclass, notes, skill_choices FROM builds WHERE id = ?",
        (build_id,),
    )
    if build_row is None:
        raise HTTPException(status_code=404, detail="Build not found")
    level_rows = fetch_all(
        "companion",
        "SELECT id, level, spells, feats, subclass_choice, multiclass_choice, note FROM build_levels WHERE build_id = ? ORDER BY level",
        (build_id,),
    )
    levels = [
        schemas.BuildLevel(
            id=row["id"],
            level=row["level"],
            spells=row.get("spells") or "",
            feats=row.get("feats") or "",
            subclass_choice=row.get("subclass_choice") or "",
            multiclass_choice=row.get("multiclass_choice") or "",
            note=row.get("note") or "",
        )
        for row in level_rows
    ]
    return schemas.Build(
        id=build_row["id"],
        name=build_row["name"],
        race=build_row.get("race"),
        class_name=build_row.get("class"),
        subclass=build_row.get("subclass"),
        notes=build_row.get("notes"),
        skill_choices=_deserialize_skill_choices(build_row.get("skill_choices")),
        levels=levels,
    )


@app.get("/api/loot", response_model=List[schemas.LootItem])
def list_loot_items() -> List[schemas.LootItem]:
    rows = fetch_all(
        "companion",
        "SELECT id, name, type, region, description, is_collected FROM items ORDER BY name COLLATE NOCASE",
    )
    return [schemas.LootItem(**_boolify(row, "is_collected")) for row in rows]


@app.post("/api/loot", response_model=schemas.LootItem, status_code=201)
def create_loot_item(payload: schemas.LootItemCreate) -> schemas.LootItem:
    try:
        new_id = execute(
            "companion",
            """
            INSERT INTO items (name, type, region, description, is_collected)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                payload.name,
                payload.type,
                payload.region,
                payload.description,
                int(payload.is_collected),
            ),
            fetch_lastrowid=True,
        )
    except sqlite3.Error as exc:
        logging.exception("Failed to create loot item")
        raise HTTPException(status_code=500, detail="Failed to create loot item") from exc
    if new_id is None:
        raise HTTPException(status_code=500, detail="Failed to create loot item")
    try:
        row = fetch_one(
            "companion",
            "SELECT id, name, type, region, description, is_collected FROM items WHERE id = ?",
            (new_id,),
        )
    except sqlite3.Error as exc:
        logging.exception("Failed to load loot item %s after creation", new_id)
        raise HTTPException(status_code=500, detail="Failed to create loot item") from exc
    if row is None:
        raise HTTPException(status_code=500, detail="Failed to create loot item")
    return schemas.LootItem(**_boolify(row, "is_collected"))


@app.put("/api/loot/{item_id}", response_model=schemas.LootItem)
def update_loot_item(item_id: int, payload: schemas.LootItemUpdate) -> schemas.LootItem:
    try:
        existing = fetch_one(
            "companion",
            "SELECT id FROM items WHERE id = ?",
            (item_id,),
        )
    except sqlite3.Error as exc:
        logging.exception("Failed to load loot item %s for update", item_id)
        raise HTTPException(status_code=500, detail="Failed to update loot item") from exc
    if existing is None:
        raise HTTPException(status_code=404, detail="Loot item not found")

    updates = payload.model_dump(exclude_unset=True)
    if "is_collected" in updates and updates["is_collected"] is not None:
        updates["is_collected"] = int(updates["is_collected"])
    if updates:
        fields = ", ".join(f"{field} = ?" for field in updates)
        values = list(updates.values())
        values.append(item_id)
        try:
            execute(
                "companion",
                f"UPDATE items SET {fields} WHERE id = ?",
                values,
            )
        except sqlite3.Error as exc:
            logging.exception("Failed to update loot item %s", item_id)
            raise HTTPException(status_code=500, detail="Failed to update loot item") from exc
    try:
        row = fetch_one(
            "companion",
            "SELECT id, name, type, region, description, is_collected FROM items WHERE id = ?",
            (item_id,),
        )
    except sqlite3.Error as exc:
        logging.exception("Failed to load loot item %s after update", item_id)
        raise HTTPException(status_code=500, detail="Failed to update loot item") from exc
    if row is None:
        raise HTTPException(status_code=404, detail="Loot item not found")
    return schemas.LootItem(**_boolify(row, "is_collected"))


@app.delete("/api/loot/{item_id}", status_code=204)
def delete_loot_item(item_id: int) -> Response:
    try:
        execute("companion", "DELETE FROM items WHERE id = ?", (item_id,))
    except sqlite3.Error as exc:
        logging.exception("Failed to delete loot item %s", item_id)
        raise HTTPException(status_code=500, detail="Failed to delete loot item") from exc
    return Response(status_code=204)


@app.get("/api/builds", response_model=List[schemas.Build])
def list_builds() -> List[schemas.Build]:
    build_rows = fetch_all(
        "companion",
        "SELECT id, name, race, class, subclass, notes, skill_choices FROM builds ORDER BY name COLLATE NOCASE",
    )
    if not build_rows:
        return []

    build_ids = [row["id"] for row in build_rows]
    placeholders = ",".join("?" for _ in build_ids)
    level_rows = fetch_all(
        "companion",
        f"""
        SELECT build_id, id, level, spells, feats, subclass_choice, multiclass_choice, note
        FROM build_levels
        WHERE build_id IN ({placeholders})
        ORDER BY level
        """,
        build_ids,
    )
    grouped_levels: Dict[int, List[schemas.BuildLevel]] = defaultdict(list)
    for row in level_rows:
        grouped_levels[row["build_id"]].append(
            schemas.BuildLevel(
                id=row["id"],
                level=row["level"],
                spells=row.get("spells") or "",
                feats=row.get("feats") or "",
                subclass_choice=row.get("subclass_choice") or "",
                multiclass_choice=row.get("multiclass_choice") or "",
                note=row.get("note") or "",
            )
        )

    builds: List[schemas.Build] = []
    for row in build_rows:
        builds.append(
            schemas.Build(
                id=row["id"],
                name=row["name"],
                race=row.get("race"),
                class_name=row.get("class"),
                subclass=row.get("subclass"),
                notes=row.get("notes"),
                skill_choices=_deserialize_skill_choices(row.get("skill_choices")),
                levels=grouped_levels.get(row["id"], []),
            )
        )
    return builds


@app.get("/api/builds/{build_id}", response_model=schemas.Build)
def get_build(build_id: int) -> schemas.Build:
    return _load_build(build_id)


def _safe_rollback(conn: sqlite3.Connection) -> None:
    try:
        if conn.in_transaction:
            conn.rollback()
    except sqlite3.Error:
        logging.exception("Failed to rollback transaction")


@app.post("/api/builds", response_model=schemas.Build, status_code=201)
def create_build(payload: schemas.BuildCreate) -> schemas.Build:
    try:
        with get_connection("companion") as conn:
            try:
                cursor = conn.execute(
                    """
                    INSERT INTO builds (name, race, class, subclass, notes, skill_choices)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        payload.name,
                        payload.race,
                        payload.class_name,
                        payload.subclass,
                        payload.notes,
                        _serialize_skill_choices(payload.skill_choices),
                    ),
                )
                new_id = cursor.lastrowid
                if not new_id:
                    raise HTTPException(status_code=500, detail="Failed to create build")

                for level in payload.levels:
                    try:
                        conn.execute(
                            """
                            INSERT INTO build_levels (build_id, level, spells, feats, subclass_choice, multiclass_choice, note)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                new_id,
                                level.level,
                                level.spells or "",
                                level.feats or "",
                                level.subclass_choice or "",
                                level.multiclass_choice or "",
                                level.note or "",
                            ),
                        )
                    except sqlite3.Error as exc:
                        logging.exception(
                            "Failed to create level %s for build %s", level.level, new_id
                        )
                        raise

                conn.commit()
            except HTTPException:
                _safe_rollback(conn)
                raise
            except sqlite3.Error as exc:
                _safe_rollback(conn)
                logging.exception("Failed to create build")
                raise HTTPException(status_code=500, detail="Failed to create build") from exc
    except sqlite3.Error as exc:
        logging.exception("Failed to create build")
        raise HTTPException(status_code=500, detail="Failed to create build") from exc
    try:
        return _load_build(int(new_id))
    except sqlite3.Error as exc:
        logging.exception("Failed to load build %s after creation", new_id)
        raise HTTPException(status_code=500, detail="Failed to create build") from exc


@app.put("/api/builds/{build_id}", response_model=schemas.Build)
def update_build(build_id: int, payload: schemas.BuildCreate) -> schemas.Build:
    try:
        with get_connection("companion") as conn:
            try:
                cursor = conn.execute(
                    "SELECT id FROM builds WHERE id = ?",
                    (build_id,),
                )
                existing = cursor.fetchone()
                if existing is None:
                    raise HTTPException(status_code=404, detail="Build not found")

                conn.execute(
                    "UPDATE builds SET name = ?, race = ?, class = ?, subclass = ?, notes = ?, skill_choices = ? WHERE id = ?",
                    (
                        payload.name,
                        payload.race,
                        payload.class_name,
                        payload.subclass,
                        payload.notes,
                        _serialize_skill_choices(payload.skill_choices),
                        build_id,
                    ),
                )
                conn.execute(
                    "DELETE FROM build_levels WHERE build_id = ?",
                    (build_id,),
                )
                for level in payload.levels:
                    try:
                        conn.execute(
                            """
                            INSERT INTO build_levels (build_id, level, spells, feats, subclass_choice, multiclass_choice, note)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                build_id,
                                level.level,
                                level.spells or "",
                                level.feats or "",
                                level.subclass_choice or "",
                                level.multiclass_choice or "",
                                level.note or "",
                            ),
                        )
                    except sqlite3.Error as exc:
                        logging.exception(
                            "Failed to update level %s for build %s", level.level, build_id
                        )
                        raise
                conn.commit()
            except HTTPException:
                _safe_rollback(conn)
                raise
            except sqlite3.Error as exc:
                _safe_rollback(conn)
                logging.exception("Failed to update build %s", build_id)
                raise HTTPException(status_code=500, detail="Failed to update build") from exc
    except sqlite3.Error as exc:
        logging.exception("Failed to update build %s", build_id)
        raise HTTPException(status_code=500, detail="Failed to update build") from exc
    try:
        return _load_build(build_id)
    except sqlite3.Error as exc:
        logging.exception("Failed to load build %s after update", build_id)
        raise HTTPException(status_code=500, detail="Failed to update build") from exc


@app.delete("/api/builds/{build_id}", status_code=204)
def delete_build(build_id: int) -> Response:
    try:
        execute("companion", "DELETE FROM build_levels WHERE build_id = ?", (build_id,))
    except sqlite3.Error as exc:
        logging.exception("Failed to delete levels for build %s", build_id)
        raise HTTPException(status_code=500, detail="Failed to delete build") from exc
    try:
        execute("companion", "DELETE FROM builds WHERE id = ?", (build_id,))
    except sqlite3.Error as exc:
        logging.exception("Failed to delete build %s", build_id)
        raise HTTPException(status_code=500, detail="Failed to delete build") from exc
    return Response(status_code=204)


@app.get("/api/bestiary", response_model=List[schemas.Enemy])
def list_enemies() -> List[schemas.Enemy]:
    rows = fetch_all(
        "companion",
        "SELECT id, name, stats, resistances, weaknesses, abilities, notes FROM enemies ORDER BY name COLLATE NOCASE",
    )
    return [schemas.Enemy(**row) for row in rows]


@app.post("/api/bestiary", response_model=schemas.Enemy, status_code=201)
def create_enemy(payload: schemas.EnemyCreate) -> schemas.Enemy:
    try:
        new_id = execute(
            "companion",
            """
            INSERT INTO enemies (name, stats, resistances, weaknesses, abilities, notes)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                payload.name,
                payload.stats,
                payload.resistances,
                payload.weaknesses,
                payload.abilities,
                payload.notes,
            ),
            fetch_lastrowid=True,
        )
    except sqlite3.Error as exc:
        logging.exception("Failed to create enemy")
        raise HTTPException(status_code=500, detail="Failed to create enemy") from exc
    if new_id is None:
        raise HTTPException(status_code=500, detail="Failed to create enemy")
    try:
        row = fetch_one(
            "companion",
            "SELECT id, name, stats, resistances, weaknesses, abilities, notes FROM enemies WHERE id = ?",
            (new_id,),
        )
    except sqlite3.Error as exc:
        logging.exception("Failed to fetch created enemy with id %s", new_id)
        raise HTTPException(status_code=500, detail="Failed to create enemy") from exc
    if row is None:
        raise HTTPException(status_code=500, detail="Failed to create enemy")
    return schemas.Enemy(**row)


@app.put("/api/bestiary/{enemy_id}", response_model=schemas.Enemy)
def update_enemy(enemy_id: int, payload: schemas.EnemyUpdate) -> schemas.Enemy:
    try:
        existing = fetch_one(
            "companion",
            "SELECT id FROM enemies WHERE id = ?",
            (enemy_id,),
        )
    except sqlite3.Error as exc:
        logging.exception("Failed to load enemy %s for update", enemy_id)
        raise HTTPException(status_code=500, detail="Failed to update enemy") from exc
    if existing is None:
        raise HTTPException(status_code=404, detail="Enemy not found")

    updates = payload.model_dump(exclude_unset=True)
    if updates:
        fields = ", ".join(f"{field} = ?" for field in updates)
        values = list(updates.values())
        values.append(enemy_id)
        try:
            execute("companion", f"UPDATE enemies SET {fields} WHERE id = ?", values)
        except sqlite3.Error as exc:
            logging.exception("Failed to update enemy %s", enemy_id)
            raise HTTPException(status_code=500, detail="Failed to update enemy") from exc
    try:
        row = fetch_one(
            "companion",
            "SELECT id, name, stats, resistances, weaknesses, abilities, notes FROM enemies WHERE id = ?",
            (enemy_id,),
        )
    except sqlite3.Error as exc:
        logging.exception("Failed to load enemy %s after update", enemy_id)
        raise HTTPException(status_code=500, detail="Failed to update enemy") from exc
    if row is None:
        raise HTTPException(status_code=404, detail="Enemy not found")
    return schemas.Enemy(**row)


@app.delete("/api/bestiary/{enemy_id}", status_code=204)
def delete_enemy(enemy_id: int) -> Response:
    try:
        execute("companion", "DELETE FROM enemies WHERE id = ?", (enemy_id,))
    except sqlite3.Error as exc:
        logging.exception("Failed to delete enemy %s", enemy_id)
        raise HTTPException(status_code=500, detail="Failed to delete enemy") from exc
    return Response(status_code=204)


def _list_equipment(
    db_key: str,
    model: Type[EquipmentModel],
    *,
    extra_fields: Dict[str, str] | None = None,
) -> List[EquipmentModel]:
    items = fetch_all(db_key, "SELECT * FROM Items")
    location_rows = fetch_all(db_key, "SELECT item_id, description FROM Locations")
    special_rows = fetch_all(
        db_key,
        "SELECT item_id, type, name, effect FROM Specials",
    )

    location_map: Dict[str, List[schemas.ArmourLocation]] = defaultdict(list)
    for row in location_rows:
        location_map[row["item_id"]].append(
            schemas.ArmourLocation(description=row.get("description") or "")
        )

    special_map: Dict[str, List[schemas.ArmourSpecial]] = defaultdict(list)
    for row in special_rows:
        special_map[row["item_id"]].append(
            schemas.ArmourSpecial(
                type=row.get("type") or "",
                name=row.get("name") or "",
                effect=row.get("effect") or "",
            )
        )

    result: List[EquipmentModel] = []
    for item in items:
        payload: Dict[str, Any] = {
            "item_id": item["item_id"],
            "name": item.get("name"),
            "description": item.get("description"),
            "quote": item.get("quote"),
            "type": item.get("type"),
            "rarity": item.get("rarity"),
            "weight_kg": item.get("weight_kg"),
            "weight_lb": item.get("weight_lb"),
            "price_gp": item.get("price_gp"),
            "image_path": item.get("image_path"),
            "locations": location_map.get(item["item_id"], []),
            "specials": special_map.get(item["item_id"], []),
        }

        if extra_fields:
            for field, source in extra_fields.items():
                payload[field] = item.get(source)

        result.append(model(**payload))

    return result


@app.get("/api/armours", response_model=List[schemas.Armour])
def list_armours() -> List[schemas.Armour]:
    return _list_equipment(
        "armours",
        schemas.Armour,
        extra_fields={
            "armour_class_base": "armour_class_base",
            "armour_class_modifier": "armour_class_modifier",
        },
    )


@app.get("/api/rings", response_model=List[schemas.Ring])
def list_rings() -> List[schemas.Ring]:
    return _list_equipment("rings", schemas.Ring)


@app.get("/api/amulets", response_model=List[schemas.Amulet])
def list_amulets() -> List[schemas.Amulet]:
    return _list_equipment("amulets", schemas.Amulet)


@app.get("/api/cloaks", response_model=List[schemas.Cloak])
def list_cloaks() -> List[schemas.Cloak]:
    return _list_equipment("cloaks", schemas.Cloak)


@app.get("/api/clothing", response_model=List[schemas.Clothing])
def list_clothing() -> List[schemas.Clothing]:
    return _list_equipment(
        "clothing",
        schemas.Clothing,
        extra_fields={
            "armour_class_base": "armour_class_base",
            "armour_class_modifier": "armour_class_modifier",
        },
    )


@app.get("/api/footwears", response_model=List[schemas.Footwear])
def list_footwears() -> List[schemas.Footwear]:
    return _list_equipment(
        "footwears",
        schemas.Footwear,
        extra_fields={"required_proficiency": "required_proficiency"},
    )


@app.get("/api/handwears", response_model=List[schemas.Handwear])
def list_handwears() -> List[schemas.Handwear]:
    return _list_equipment("handwears", schemas.Handwear)


@app.get("/api/headwears", response_model=List[schemas.Headwear])
def list_headwears() -> List[schemas.Headwear]:
    return _list_equipment("headwears", schemas.Headwear)


@app.get("/api/shields", response_model=List[schemas.Shield])
def list_shields() -> List[schemas.Shield]:
    return _list_equipment(
        "shields",
        schemas.Shield,
        extra_fields={"shield_class_base": "shield_class_base"},
    )


@app.get("/api/weapons", response_model=List[schemas.Weapon])
def list_weapons() -> List[schemas.Weapon]:
    weapons = fetch_all("weapons", "SELECT * FROM Weapons")
    damages = fetch_all("weapons", "SELECT weapon_id, damage_dice, damage_bonus, damage_total_range, modifier, damage_type, damage_source FROM Damage")
    actions = fetch_all("weapons", "SELECT weapon_id, name, description FROM Weapon_Actions")
    abilities = fetch_all("weapons", "SELECT weapon_id, name, description FROM Special_Abilities")
    locations = fetch_all("weapons", "SELECT weapon_id, location_description FROM Weapon_Locations")
    notes = fetch_all("weapons", "SELECT weapon_id, note_content FROM Notes")

    damage_map: Dict[str, List[schemas.WeaponDamage]] = defaultdict(list)
    for row in damages:
        damage_map[row["weapon_id"]].append(
            schemas.WeaponDamage(
                damage_dice=row.get("damage_dice"),
                damage_bonus=row.get("damage_bonus"),
                damage_total_range=row.get("damage_total_range"),
                modifier=row.get("modifier"),
                damage_type=row.get("damage_type"),
                damage_source=row.get("damage_source"),
            )
        )

    action_map: Dict[str, List[schemas.WeaponAction]] = defaultdict(list)
    for row in actions:
        action_map[row["weapon_id"]].append(
            schemas.WeaponAction(name=row.get("name") or "", description=row.get("description"))
        )

    ability_map: Dict[str, List[schemas.WeaponAbility]] = defaultdict(list)
    for row in abilities:
        ability_map[row["weapon_id"]].append(
            schemas.WeaponAbility(name=row.get("name") or "", description=row.get("description"))
        )

    location_map: Dict[str, List[schemas.WeaponLocation]] = defaultdict(list)
    for row in locations:
        location_map[row["weapon_id"]].append(
            schemas.WeaponLocation(description=row.get("location_description") or "")
        )

    note_map: Dict[str, List[schemas.WeaponNote]] = defaultdict(list)
    for row in notes:
        note_map[row["weapon_id"]].append(
            schemas.WeaponNote(content=row.get("note_content") or "")
        )

    result: List[schemas.Weapon] = []
    for weapon in weapons:
        result.append(
            schemas.Weapon(
                weapon_id=weapon["weapon_id"],
                name=weapon.get("name"),
                rarity=weapon.get("rarity"),
                description=weapon.get("description"),
                quote=weapon.get("quote"),
                weight_kg=weapon.get("weight_kg"),
                weight_lb=weapon.get("weight_lb"),
                price=weapon.get("price"),
                enchantment=weapon.get("enchantment"),
                type=weapon.get("type"),
                range_m=weapon.get("range_m"),
                range_f=weapon.get("range_f"),
                attributes=weapon.get("attributes"),
                image_path=weapon.get("image_path"),
                damages=damage_map.get(weapon["weapon_id"], []),
                actions=action_map.get(weapon["weapon_id"], []),
                abilities=ability_map.get(weapon["weapon_id"], []),
                locations=location_map.get(weapon["weapon_id"], []),
                notes=note_map.get(weapon["weapon_id"], []),
            )
        )
    return result


def _infer_spell_school(description: Optional[str]) -> Optional[str]:
    if not description:
        return None
    for pattern, canonical in SPELL_SCHOOL_PATTERNS:
        if pattern.search(description):
            return canonical
    return None


@app.get("/api/spells", response_model=List[schemas.Spell])
def list_spells() -> List[schemas.Spell]:
    spells = fetch_all(
        "spells",
        """
        SELECT name, level, description, image_path
        FROM Spells
        ORDER BY name COLLATE NOCASE
        """,
    )
    properties = fetch_all(
        "spells",
        """
        SELECT spell_name, property_name, property_value
        FROM Spell_Properties
        ORDER BY spell_name COLLATE NOCASE, property_name COLLATE NOCASE
        """,
    )

    prop_map: Dict[str, List[schemas.SpellProperty]] = defaultdict(list)
    for row in properties:
        prop_map[row["spell_name"]].append(
            schemas.SpellProperty(name=row.get("property_name") or "", value=row.get("property_value") or "")
        )

    return [
        schemas.Spell(
            name=row["name"],
            level=row.get("level"),
            school=_infer_spell_school(row.get("description")),
            description=row.get("description"),
            image_path=row.get("image_path"),
            properties=prop_map.get(row["name"], []),
        )
        for row in spells
    ]


@app.get("/api/races", response_model=List[schemas.Race])
def list_races() -> List[schemas.Race]:
    races = fetch_all("races", "SELECT name, description, base_speed, size FROM races")
    subraces = fetch_all("races", "SELECT race_name, name, description FROM subraces")
    racial_features = fetch_all("races", "SELECT race_name, name, description FROM racial_features")
    subrace_features = fetch_all("races", "SELECT subrace_name, name, description FROM subrace_features")

    race_feature_map: Dict[str, List[schemas.RaceFeature]] = defaultdict(list)
    for row in racial_features:
        race_feature_map[row["race_name"]].append(
            schemas.RaceFeature(name=row.get("name") or "", description=row.get("description"))
        )

    subrace_map: Dict[str, List[schemas.Subrace]] = defaultdict(list)
    subrace_feature_map: Dict[str, List[schemas.SubraceFeature]] = defaultdict(list)
    for row in subrace_features:
        subrace_feature_map[row["subrace_name"]].append(
            schemas.SubraceFeature(name=row.get("name") or "", description=row.get("description"))
        )

    for row in subraces:
        key = row["name"]
        subrace_map[row["race_name"]].append(
            schemas.Subrace(
                name=row.get("name") or "",
                description=row.get("description"),
                features=subrace_feature_map.get(key, []),
            )
        )

    return [
        schemas.Race(
            name=row["name"],
            description=row.get("description"),
            base_speed=row.get("base_speed"),
            size=row.get("size"),
            features=race_feature_map.get(row["name"], []),
            subraces=subrace_map.get(row["name"], []),
        )
        for row in races
    ]


@app.get("/api/classes", response_model=List[schemas.CharacterClass])
def list_classes() -> List[schemas.CharacterClass]:
    classes = fetch_all("classes", "SELECT * FROM Classes")
    subclasses = fetch_all("classes", "SELECT class_name, name, description FROM Subclasses")
    subclass_features = fetch_all(
        "classes",
        "SELECT subclass_name, level, feature_name, feature_description FROM Subclasses_Features",
    )
    progressions = fetch_all("classes", "SELECT * FROM Class_Progression")
    class_spells = fetch_all(
        "classes",
        "SELECT class_name, level, spell_name FROM Class_Spells_Learned",
    )

    subclass_feature_map: Dict[str, List[schemas.SubclassFeature]] = defaultdict(list)
    for row in subclass_features:
        subclass_feature_map[row["subclass_name"]].append(
            schemas.SubclassFeature(
                level=row.get("level"),
                feature_name=row.get("feature_name") or "",
                feature_description=row.get("feature_description"),
            )
        )

    subclass_map: Dict[str, List[schemas.Subclass]] = defaultdict(list)
    for row in subclasses:
        subclass_map[row["class_name"]].append(
            schemas.Subclass(
                name=row.get("name") or "",
                description=row.get("description"),
                features=subclass_feature_map.get(row.get("name"), []),
            )
        )

    progression_map: Dict[str, List[schemas.ClassProgressionEntry]] = defaultdict(list)
    spells_learned_map: Dict[str, Dict[int, set[str]]] = defaultdict(lambda: defaultdict(set))
    for row in progressions:
        progression_map[row["class_name"]].append(
            schemas.ClassProgressionEntry(
                level=row.get("level"),
                proficiency_bonus=row.get("proficiency_bonus"),
                features=row.get("features"),
                rage_charges=row.get("rage_charges"),
                rage_damage=row.get("rage_damage"),
                cantrips_known=row.get("cantrips_known"),
                spells_known=row.get("spells_known"),
                spell_slots_1st=row.get("spell_slots_1st"),
                spell_slots_2nd=row.get("spell_slots_2nd"),
                spell_slots_3rd=row.get("spell_slots_3rd"),
                spell_slots_4th=row.get("spell_slots_4th"),
                spell_slots_5th=row.get("spell_slots_5th"),
                spell_slots_6th=row.get("spell_slots_6th"),
                sorcery_points=row.get("sorcery_points"),
                sneak_attack_damage=row.get("sneak_attack_damage"),
                bardic_inspiration_charges=row.get("bardic_inspiration_charges"),
                channel_divinity_charges=row.get("channel_divinity_charges"),
                lay_on_hands_charges=row.get("lay_on_hands_charges"),
                ki_points=row.get("ki_points"),
                unarmoured_movement_bonus=row.get("unarmoured_movement_bonus"),
                martial_arts_damage=row.get("martial_arts_damage"),
                spell_slots_per_level=row.get("spell_slots_per_level"),
                invocations_known=row.get("invocations_known"),
            )
        )

    for row in class_spells:
        class_name = row.get("class_name")
        level = row.get("level")
        spell_name = row.get("spell_name")
        if not class_name or level is None or not spell_name:
            continue
        spells_learned_map[class_name][int(level)].add(spell_name)

    result: List[schemas.CharacterClass] = []
    for row in classes:
        result.append(
            schemas.CharacterClass(
                name=row.get("name"),
                description=row.get("description"),
                hit_points_at_level1=row.get("hit_points_at_level1"),
                hit_points_on_level_up=row.get("hit_points_on_level_up"),
                key_abilities=row.get("key_abilities"),
                saving_throw_proficiencies=row.get("saving_throw_proficiencies"),
                equipment_proficiencies=row.get("equipment_proficiencies"),
                skill_proficiencies=row.get("skill_proficiencies"),
                spellcasting_ability=row.get("spellcasting_ability"),
                starting_equipment=row.get("starting_equipment"),
                subclasses=subclass_map.get(row.get("name"), []),
                progression=sorted(
                    progression_map.get(row.get("name"), []),
                    key=lambda entry: entry.level,
                ),
                spells_learned=[
                    schemas.ClassSpellList(level=level, spells=sorted(spells))
                    for level, spells in sorted(spells_learned_map.get(row.get("name"), {}).items())
                ],
            )
        )
    return result


@app.get("/api/backgrounds", response_model=List[schemas.Background])
def list_backgrounds() -> List[schemas.Background]:
    backgrounds = fetch_all(
        "backgrounds", "SELECT name, description FROM Backgrounds"
    )
    if not backgrounds:
        return []

    skill_rows = fetch_all(
        "backgrounds",
        "SELECT background_name, skill_name FROM Background_Skills",
    )
    character_rows = fetch_all(
        "backgrounds",
        "SELECT background_name, character_name FROM Background_Characters",
    )
    note_rows = fetch_all(
        "backgrounds", "SELECT background_name, note FROM Background_Notes"
    )

    skill_map: Dict[str, List[schemas.BackgroundSkill]] = defaultdict(list)
    for row in skill_rows:
        skill_map[row["background_name"]].append(
            schemas.BackgroundSkill(name=row.get("skill_name") or "")
        )

    character_map: Dict[str, List[schemas.BackgroundCharacter]] = defaultdict(list)
    for row in character_rows:
        character_map[row["background_name"]].append(
            schemas.BackgroundCharacter(name=row.get("character_name") or "")
        )

    note_map: Dict[str, List[schemas.BackgroundNote]] = defaultdict(list)
    for row in note_rows:
        note_map[row["background_name"]].append(
            schemas.BackgroundNote(note=row.get("note") or "")
        )

    return [
        schemas.Background(
            name=row["name"],
            description=row.get("description"),
            skills=skill_map.get(row["name"], []),
            characters=character_map.get(row["name"], []),
            notes=note_map.get(row["name"], []),
        )
        for row in backgrounds
    ]


@app.get("/api/feats", response_model=List[schemas.Feat])
def list_feats() -> List[schemas.Feat]:
    feats = fetch_all(
        "feats", "SELECT name, description, prerequisite FROM Feats"
    )
    if not feats:
        return []

    option_rows = fetch_all(
        "feats",
        "SELECT feat_name, option_name, description FROM Feat_Options",
    )
    note_rows = fetch_all(
        "feats", "SELECT feat_name, note FROM Feat_Notes"
    )

    option_map: Dict[str, List[schemas.FeatOption]] = defaultdict(list)
    for row in option_rows:
        option_map[row["feat_name"]].append(
            schemas.FeatOption(
                name=row.get("option_name") or "",
                description=row.get("description"),
            )
        )

    note_map: Dict[str, List[schemas.FeatNote]] = defaultdict(list)
    for row in note_rows:
        note_map[row["feat_name"]].append(
            schemas.FeatNote(note=row.get("note") or "")
        )

    return [
        schemas.Feat(
            name=row["name"],
            description=row.get("description"),
            prerequisite=row.get("prerequisite"),
            options=option_map.get(row["name"], []),
            notes=note_map.get(row["name"], []),
        )
        for row in feats
    ]


@app.get("/api/abilities", response_model=List[schemas.Ability])
def list_abilities() -> List[schemas.Ability]:
    abilities = fetch_all(
        "abilities", "SELECT name, description, image_path FROM Abilities"
    )
    if not abilities:
        return []

    use_rows = fetch_all(
        "abilities",
        "SELECT ability_name, use_name, description FROM Ability_Uses",
    )
    check_rows = fetch_all(
        "abilities",
        "SELECT ability_name, check_type, description FROM Ability_Checks",
    )
    skill_rows = fetch_all(
        "abilities",
        "SELECT ability_name, skill_name, description FROM Ability_Check_Skills",
    )
    save_rows = fetch_all(
        "abilities", "SELECT ability_name, description FROM Ability_Saves"
    )

    use_map: Dict[str, List[schemas.AbilityUse]] = defaultdict(list)
    for row in use_rows:
        use_map[row["ability_name"]].append(
            schemas.AbilityUse(
                name=row.get("use_name") or "",
                description=row.get("description"),
            )
        )

    check_map: Dict[str, List[schemas.AbilityCheck]] = defaultdict(list)
    for row in check_rows:
        check_map[row["ability_name"]].append(
            schemas.AbilityCheck(
                type=row.get("check_type"),
                description=row.get("description"),
            )
        )

    skill_map: Dict[str, List[schemas.AbilitySkill]] = defaultdict(list)
    for row in skill_rows:
        skill_map[row["ability_name"]].append(
            schemas.AbilitySkill(
                name=row.get("skill_name") or "",
                description=row.get("description"),
            )
        )

    save_map: Dict[str, List[schemas.AbilitySave]] = defaultdict(list)
    for row in save_rows:
        save_map[row["ability_name"]].append(
            schemas.AbilitySave(description=row.get("description"))
        )

    return [
        schemas.Ability(
            name=row["name"],
            description=row.get("description"),
            image_path=row.get("image_path"),
            uses=use_map.get(row["name"], []),
            checks=check_map.get(row["name"], []),
            skills=skill_map.get(row["name"], []),
            saves=save_map.get(row["name"], []),
        )
        for row in abilities
    ]
