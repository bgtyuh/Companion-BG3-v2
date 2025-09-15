from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class LootItemBase(BaseModel):
    name: str
    type: Optional[str] = None
    region: Optional[str] = None
    description: Optional[str] = None


class LootItemCreate(LootItemBase):
    is_collected: bool = False


class LootItemUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    region: Optional[str] = None
    description: Optional[str] = None
    is_collected: Optional[bool] = None


class LootItem(LootItemBase):
    id: int
    is_collected: bool

    model_config = {"from_attributes": True}


class BuildLevelBase(BaseModel):
    level: int = Field(ge=1, le=12)
    spells: Optional[str] = ""
    feats: Optional[str] = ""
    subclass_choice: Optional[str] = ""
    multiclass_choice: Optional[str] = ""


class BuildLevelCreate(BuildLevelBase):
    pass


class BuildLevel(BuildLevelBase):
    id: Optional[int] = None

    model_config = {"from_attributes": True}


class BuildBase(BaseModel):
    name: str
    race: Optional[str] = None
    class_name: Optional[str] = Field(default=None, alias="class")
    subclass: Optional[str] = None
    notes: Optional[str] = None
    levels: List[BuildLevel] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class BuildCreate(BuildBase):
    levels: List[BuildLevelCreate] = Field(default_factory=list)


class Build(BuildBase):
    id: int

    model_config = {
        "populate_by_name": True,
        "from_attributes": True,
    }


class EnemyBase(BaseModel):
    name: str
    stats: Optional[str] = None
    resistances: Optional[str] = None
    weaknesses: Optional[str] = None
    abilities: Optional[str] = None
    notes: Optional[str] = None


class EnemyCreate(EnemyBase):
    pass


class EnemyUpdate(BaseModel):
    name: Optional[str] = None
    stats: Optional[str] = None
    resistances: Optional[str] = None
    weaknesses: Optional[str] = None
    abilities: Optional[str] = None
    notes: Optional[str] = None


class Enemy(EnemyBase):
    id: int

    model_config = {"from_attributes": True}


class ArmourLocation(BaseModel):
    description: str


class ArmourSpecial(BaseModel):
    type: str
    name: str
    effect: str


class Armour(BaseModel):
    item_id: str
    name: str
    description: Optional[str] = None
    quote: Optional[str] = None
    type: Optional[str] = None
    rarity: Optional[str] = None
    weight_kg: Optional[float] = None
    weight_lb: Optional[float] = None
    price_gp: Optional[float] = None
    armour_class_base: Optional[int] = None
    armour_class_modifier: Optional[str] = None
    locations: List[ArmourLocation] = Field(default_factory=list)
    specials: List[ArmourSpecial] = Field(default_factory=list)


class AccessoryBase(BaseModel):
    item_id: str
    name: str
    description: Optional[str] = None
    quote: Optional[str] = None
    type: Optional[str] = None
    rarity: Optional[str] = None
    weight_kg: Optional[float] = None
    weight_lb: Optional[float] = None
    price_gp: Optional[float] = None
    locations: List[ArmourLocation] = Field(default_factory=list)
    specials: List[ArmourSpecial] = Field(default_factory=list)


class Ring(AccessoryBase):
    pass


class Amulet(AccessoryBase):
    pass


class Cloak(AccessoryBase):
    pass


class Handwear(AccessoryBase):
    pass


class Headwear(AccessoryBase):
    pass


class Clothing(AccessoryBase):
    armour_class_base: Optional[int] = None
    armour_class_modifier: Optional[str] = None


class Footwear(AccessoryBase):
    required_proficiency: Optional[str] = None


class Shield(AccessoryBase):
    shield_class_base: Optional[int] = None


class WeaponDamage(BaseModel):
    damage_dice: Optional[str] = None
    damage_bonus: Optional[int] = None
    damage_total_range: Optional[str] = None
    modifier: Optional[str] = None
    damage_type: Optional[str] = None
    damage_source: Optional[str] = None


class WeaponAction(BaseModel):
    name: str
    description: Optional[str] = None


class WeaponAbility(BaseModel):
    name: str
    description: Optional[str] = None


class WeaponLocation(BaseModel):
    description: str


class WeaponNote(BaseModel):
    content: str


class Weapon(BaseModel):
    weapon_id: str
    name: str
    rarity: Optional[str] = None
    description: Optional[str] = None
    quote: Optional[str] = None
    weight_kg: Optional[float] = None
    weight_lb: Optional[float] = None
    price: Optional[int] = None
    enchantment: Optional[int] = None
    type: Optional[str] = None
    range_m: Optional[float] = None
    range_f: Optional[float] = None
    attributes: Optional[str] = None
    damages: List[WeaponDamage] = Field(default_factory=list)
    actions: List[WeaponAction] = Field(default_factory=list)
    abilities: List[WeaponAbility] = Field(default_factory=list)
    locations: List[WeaponLocation] = Field(default_factory=list)
    notes: List[WeaponNote] = Field(default_factory=list)


class SpellProperty(BaseModel):
    name: str
    value: str


class Spell(BaseModel):
    name: str
    level: Optional[str] = None
    description: Optional[str] = None
    properties: List[SpellProperty] = Field(default_factory=list)


class SubraceFeature(BaseModel):
    name: str
    description: Optional[str] = None


class Subrace(BaseModel):
    name: str
    description: Optional[str] = None
    features: List[SubraceFeature] = Field(default_factory=list)


class RaceFeature(BaseModel):
    name: str
    description: Optional[str] = None


class Race(BaseModel):
    name: str
    description: Optional[str] = None
    base_speed: Optional[str] = None
    size: Optional[str] = None
    features: List[RaceFeature] = Field(default_factory=list)
    subraces: List[Subrace] = Field(default_factory=list)


class SubclassFeature(BaseModel):
    level: int
    feature_name: str
    feature_description: Optional[str] = None


class Subclass(BaseModel):
    name: str
    description: Optional[str] = None
    features: List[SubclassFeature] = Field(default_factory=list)


class ClassProgressionEntry(BaseModel):
    level: int
    proficiency_bonus: Optional[str] = None
    features: Optional[str] = None
    rage_charges: Optional[int] = None
    rage_damage: Optional[int] = None
    cantrips_known: Optional[int] = None
    spells_known: Optional[int] = None
    spell_slots_1st: Optional[int] = None
    spell_slots_2nd: Optional[int] = None
    spell_slots_3rd: Optional[int] = None
    spell_slots_4th: Optional[int] = None
    spell_slots_5th: Optional[int] = None
    spell_slots_6th: Optional[int] = None
    sorcery_points: Optional[int] = None
    sneak_attack_damage: Optional[str] = None
    bardic_inspiration_charges: Optional[int] = None
    channel_divinity_charges: Optional[int] = None
    lay_on_hands_charges: Optional[int] = None
    ki_points: Optional[int] = None
    unarmoured_movement_bonus: Optional[str] = None
    martial_arts_damage: Optional[str] = None
    spell_slots_per_level: Optional[str] = None
    invocations_known: Optional[int] = None


class CharacterClass(BaseModel):
    name: str
    description: Optional[str] = None
    hit_points_at_level1: Optional[str] = None
    hit_points_on_level_up: Optional[str] = None
    key_abilities: Optional[str] = None
    saving_throw_proficiencies: Optional[str] = None
    equipment_proficiencies: Optional[str] = None
    skill_proficiencies: Optional[str] = None
    spellcasting_ability: Optional[str] = None
    starting_equipment: Optional[str] = None
    subclasses: List[Subclass] = Field(default_factory=list)
    progression: List[ClassProgressionEntry] = Field(default_factory=list)
