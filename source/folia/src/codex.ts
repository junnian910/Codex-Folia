import 'pixi.js/unsafe-eval';
import './index';

// src/codex.ts
// Pixi's CSP implementation uses ordinary functions for shaders, uniforms and particles.
// Install it before the original app boots; Codex disallows generated JavaScript functions.
