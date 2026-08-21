# Arnak Web Engine

This directory contains the first Web-native game-engine layer derived from the TTS implementation in `src/`.

## Goals

- Keep game rules independent from UI and networking.
- Represent the game as deterministic `GameState -> Action -> GameState` transitions.
- Start with the base game's core loop and expand incrementally.
- Keep TTS GUIDs and positional data out of the Web engine.

## Initial model

```text
GameState
  ├─ phase / round / turn
  ├─ players
  ├─ board
  ├─ market
  └─ research track

Action
  ├─ place worker
  ├─ travel / explore
  ├─ buy / play card
  ├─ research
  └─ end turn / round

Reducer
  GameState + Action -> GameState
```

The first implementation intentionally contains only data structures and pure transitions. UI, WebSocket synchronization, persistence, and AI will sit above this layer.
