<template>
  <div class="orbital-viewport"></div>
</template>

<script lang="ts">
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { toRaw } from '@vue/reactivity';
import Stats from 'three/examples/jsm/libs/stats.module';
import Globe from '../visualisation/globe';
import GeoJsonMixin from '../visualisation/geoJson.mixin';

interface ViewPortState {
  width: number;
  height: number;
  camera: THREE.Camera;
  controls: OrbitControls;
  scene: THREE.Scene;
  renderer: THREE.Renderer;
}

export default class OrbitalViewPort extends GeoJsonMixin {
  // This is a reactive version that's messing with rendering framerate.
  // state: ViewPortState | null = null;
  state!: ViewPortState;

  globeObject!: THREE.Object3D;

  stats!: Stats;

  mounted(): void {
    this.initialiseViewPort();
    this.stats = Stats();
    this.$el.appendChild(this.stats.dom);
    this.animate();
    this.globeObject = this.initialiseGlobe();
    this.populateWithGeoJsonData(10, 'sphere', this.globeObject);
  }

  private animate(): void {
    this.stats.begin();
    const S = this.state;
    S.controls.update();
    S.renderer.render(toRaw(S.scene), S.camera);
    this.stats.end();

    window.requestAnimationFrame(this.animate);
  }

  private initialiseGlobe(): THREE.Object3D {
    if (this.state == null) {
      throw new Error('Failed to initialise globe: Viewport state not initialised.');
    }

    const globe = new Globe(10.0);
    globe.addGrid(20);
    const globeObject = globe.get3dObject();
    this.state.scene.add(toRaw(globeObject));
    return globeObject;
  }

  private initialiseViewPort(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    this.$el.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.5, 1000);
    camera.position.z = -20;

    const controls = new OrbitControls(camera, renderer.domElement);

    this.state = toRaw({
      width,
      height,
      camera,
      controls,
      scene,
      renderer,
    });
  }
}
</script>
