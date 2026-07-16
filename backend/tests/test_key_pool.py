"""Key-pool rotation, exercised without spending a single Gemini request.

Free-tier quota is small and per-day (CLAUDE.md), so the rotation path must be provable
against fakes — hitting the real API to test failover would burn the very quota the
pool exists to conserve.
"""
from datetime import datetime, timedelta, timezone

import pytest

import server
from server import GeminiKeyPool, _load_api_keys


@pytest.fixture
def pool(monkeypatch):
    """A pool of four keys whose clients are inert stand-ins."""
    monkeypatch.setattr(server.genai, "Client", lambda api_key: f"client:{api_key}")
    return GeminiKeyPool(["aaaa1111", "bbbb2222", "cccc3333", "dddd4444"])


class TestKeyLoading:
    def test_reads_comma_separated_keys(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEYS", "k1,k2,k3")
        assert _load_api_keys() == ["k1", "k2", "k3"]

    def test_tolerates_whitespace_and_blanks(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEYS", " k1 , ,k2,, k3 ")
        assert _load_api_keys() == ["k1", "k2", "k3"]

    def test_drops_duplicates_so_one_key_isnt_tried_twice(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEYS", "k1,k2,k1")
        assert _load_api_keys() == ["k1", "k2"]

    def test_falls_back_to_the_single_key_variable(self, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEYS", raising=False)
        monkeypatch.setenv("GEMINI_API_KEY", "solo")
        assert _load_api_keys() == ["solo"]

    def test_plural_wins_over_singular(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEYS", "k1,k2")
        monkeypatch.setenv("GEMINI_API_KEY", "old")
        assert _load_api_keys() == ["k1", "k2"]

    def test_no_keys_yields_an_empty_falsy_pool(self, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEYS", raising=False)
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        assert _load_api_keys() == []
        monkeypatch.setattr(server.genai, "Client", lambda api_key: None)
        assert not GeminiKeyPool([])


class TestRotation:
    def test_stays_on_one_key_while_it_works(self, pool):
        assert [pool.acquire()[0] for _ in range(5)] == [0, 0, 0, 0, 0]

    def test_exhausting_a_key_advances_to_the_next(self, pool):
        idx, _, _ = pool.acquire()
        pool.mark_exhausted(idx)
        assert pool.acquire()[0] == 1

    def test_walks_every_key_as_each_runs_out(self, pool):
        seen = []
        for _ in range(4):
            idx, _, _ = pool.acquire()
            seen.append(idx)
            pool.mark_exhausted(idx)
        assert seen == [0, 1, 2, 3], "each key should get exactly one turn"

    def test_all_exhausted_reports_none_rather_than_looping(self, pool):
        for _ in range(4):
            pool.mark_exhausted(pool.acquire()[0])
        assert pool.acquire() is None

    def test_a_cooled_off_key_comes_back(self, pool):
        for _ in range(4):
            pool.mark_exhausted(pool.acquire()[0])
        assert pool.acquire() is None
        # key 2's cooldown lapses
        pool._cooling_until[2] = datetime.now(timezone.utc) - timedelta(seconds=1)
        assert pool.acquire()[0] == 2

    def test_cooldown_is_not_permanent(self, pool):
        pool.mark_exhausted(0)
        until = pool._cooling_until[0]
        assert until is not None
        assert until <= datetime.now(timezone.utc) + timedelta(seconds=server.KEY_COOLDOWN_SECONDS)


class TestNoKeyLeaks:
    """A key in a log or an HTTP response is a credential leak."""

    def test_labels_expose_only_the_last_four_chars(self, pool):
        for entry in pool.status():
            assert "aaaa1111" not in entry["key"]
            assert "bbbb2222" not in entry["key"]
        assert pool.status()[0]["key"] == "key1(…1111)"

    def test_status_reports_cooling_state(self, pool):
        pool.mark_exhausted(0)
        status = pool.status()
        assert status[0]["cooling"] is True
        assert status[0]["available_in_seconds"] > 0
        assert status[1]["cooling"] is False
        assert status[1]["available_in_seconds"] == 0
