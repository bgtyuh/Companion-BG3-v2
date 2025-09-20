from fastapi.testclient import TestClient


def test_classes_expose_spells_learned(client: TestClient) -> None:
    response = client.get('/api/classes')
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload, list)

    wizard = next((entry for entry in payload if entry['name'] == 'Wizard'), None)
    assert wizard is not None

    spells_learned = wizard['spells_learned']
    assert isinstance(spells_learned, list)
    assert spells_learned, 'expected wizard to learn spells at some levels'

    levels = [entry['level'] for entry in spells_learned]
    assert levels == sorted(levels)

    for entry in spells_learned:
        assert 'level' in entry and 'spells' in entry
        assert entry['spells'] == sorted(entry['spells'])
