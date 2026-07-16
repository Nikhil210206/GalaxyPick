"""The wizard's ids must exist in the catalog, or filters silently do nothing.

Every control in the wizard posts a bare string to /api/recommend, which is matched
against each phone's match_tags. A typo, a rename, or a chip added without a matching
tag doesn't raise — it scores zero against every phone and the filter quietly stops
working. That is exactly how 's_pen' shipped: the chip existed, no phone carried the
tag, and the wizard cheerfully recommended phones with no S-Pen.

These tests read the ids straight out of the JSX so the frontend can't drift away from
the catalog without the suite going red.
"""
import re
from pathlib import Path

import pytest

from phones import PHONES, catalog_vocabulary, satisfies, match_score, _LATEST_YEAR

PAGES = Path(__file__).resolve().parents[2] / "frontend" / "src" / "pages"

# The wizard declares ids as `id: 'foo'` inside its option lists.
_ID = re.compile(r"id:\s*'([a-z0-9_]+)'")


def ids_from(filename):
    return _ID.findall((PAGES / filename).read_text())


def test_pages_exist():
    """Guard the guard: a moved file must fail loudly, not vacuously pass."""
    for f in ("Needs.jsx", "Preferences.jsx", "SelectPersona.jsx"):
        assert (PAGES / f).is_file(), f"{f} moved — these tests would silently pass"


@pytest.mark.parametrize("filename", ["Needs.jsx", "Preferences.jsx", "SelectPersona.jsx"])
def test_ids_were_actually_found(filename):
    """If the regex stops matching, every assertion below passes on an empty list."""
    assert len(ids_from(filename)) >= 4, f"parsed too few ids from {filename}"


@pytest.mark.parametrize("filename", ["Needs.jsx", "Preferences.jsx", "SelectPersona.jsx"])
def test_every_wizard_id_matches_at_least_one_phone(filename):
    vocabulary = catalog_vocabulary()
    dead = [i for i in ids_from(filename) if i not in vocabulary]
    assert not dead, (
        f"{filename} offers {dead}, which no phone carries in match_tags. "
        f"Those controls will silently do nothing. Either tag the phones or drop them."
    )


def test_s_pen_only_matches_phones_that_have_one():
    """The original bug, pinned: asking for an S-Pen must never return a phone without."""
    s_pen_phones = [p for p in PHONES if satisfies(p, ["s_pen"])]
    assert s_pen_phones, "no phone carries the s_pen tag"
    for phone in s_pen_phones:
        assert any("S-Pen" in f for f in phone["features"]), (
            f"{phone['name']} is tagged s_pen but lists no S-Pen feature"
        )
    for phone in PHONES:
        if any("S-Pen" in f for f in phone["features"]):
            assert satisfies(phone, ["s_pen"]), f"{phone['name']} has an S-Pen but isn't tagged"


def test_hard_preference_excludes_rather_than_ranks():
    """A preference must filter, not merely nudge a phone up the list."""
    assert not satisfies(next(p for p in PHONES if p["id"] == "a56"), ["s_pen"])
    assert satisfies(next(p for p in PHONES if p["id"] == "s25-ultra"), ["s_pen"])


def test_every_preference_can_actually_exclude_something():
    """A filter every phone matches is decorative — it can never change a result.

    '5G ready' shipped like this: all 12 phones are 5G, so ticking it did nothing except
    pad the "no matches" message with a filter that wasn't to blame.
    """
    for pref in ids_from("Preferences.jsx"):
        matching = sum(1 for p in PHONES if pref in p["match_tags"])
        assert matching < len(PHONES), (
            f"preference '{pref}' matches all {len(PHONES)} phones, so it can never "
            f"narrow anything. Drop the chip or make it discriminate."
        )
        assert matching > 0, f"preference '{pref}' matches no phone and excludes everything"


def test_derived_tags_track_the_specs():
    """Derived tags must follow the data, not a hand-written copy of it."""
    for phone in PHONES:
        size = float(re.search(r'([\d.]+)"', phone["specs"]["display"]).group(1))
        if size < 6.4:
            assert "compact" in phone["match_tags"], f"{phone['name']} ({size}\") should be compact"
        elif size >= 6.7:
            assert "large_screen" in phone["match_tags"], f"{phone['name']} ({size}\") should be large_screen"
        assert ("latest" in phone["match_tags"]) == (phone["year"] == _LATEST_YEAR)


def test_every_series_has_a_filter_on_the_models_page():
    """A series with no filter chip is reachable only from 'All models'.

    Adding the F-series to the catalog needed a matching chip in Models.jsx; nothing
    would have complained otherwise, the phones would just have been hard to find.
    """
    filters = set(re.findall(r"id: '(\w+)'", (PAGES / "Models.jsx").read_text()))
    assert "all" in filters, "parsed no filters from Models.jsx"
    # the 'Fold' chip also covers 'Flip' through a custom match predicate
    covered = filters | ({"Flip"} if "Fold" in filters else set())
    missing = {p["series"] for p in PHONES} - covered
    assert not missing, f"catalog series with no filter chip: {sorted(missing)}"


def test_system_prompt_offers_exactly_the_catalog():
    """Galaxy AI must be told about every phone, and about no phone that doesn't exist.

    The prompt's lineup was hand-written and drifted — it kept offering the A55 and M55
    after both were discontinued and replaced. A phone the model names but PHONES lacks
    gets no product card, because phones_mentioned() has nothing to match against.
    """
    import server

    section = (
        server.SYSTEM_PROMPT
        .split("Available Samsung phones you can recommend:")[1]
        .split("Guidelines:")[0]
    )
    listed = re.findall(r"^- (.+?) \(₹", section, re.M)
    assert sorted(listed) == sorted(p["name"] for p in PHONES)


def test_match_score_stays_in_range():
    tags = list(catalog_vocabulary())
    for phone in PHONES:
        for budget in (None, 1, 75000, 10**9):
            assert 0 <= match_score(phone, tags, budget) <= 99
