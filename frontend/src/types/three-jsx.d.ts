// Type declarations for Three.js JSX elements
import * as THREE from 'three';

declare namespace JSX {
  interface IntrinsicElements extends THREE.JSX.IntrinsicElements {}
}