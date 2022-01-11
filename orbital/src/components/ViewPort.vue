<template>
  <div class="viewport"></div>
</template>

<script lang="ts">
import { Vue } from 'vue-class-component';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { toRaw } from '@vue/reactivity';
import Globe from '../visualisation/globe';

interface ViewPortState {
  width: number;
  height: number;
  camera: THREE.Camera;
  controls: OrbitControls;
  scene: THREE.Scene;
  renderer: THREE.Renderer;
}

export default class ViewPort extends Vue {
  state: ViewPortState | null = null;

  mounted(): void {
    this.initialiseViewPort();
    this.$nextTick(() => {
      this.animate();
      this.initialiseGlobe();
    });
  }

  private animate(): void {
    const S = this.state;
    if (S == null) {
      console.error('Viewport state not initialised.');
      return;
    }

    S.controls.update();
    S.renderer.render(toRaw(S.scene), S.camera);
    window.requestAnimationFrame(this.animate);
  }

  private initialiseGlobe(): void {
    if (this.state == null) {
      console.error('Failed to initialise globe: Viewport state not initialised.');
      return;
    }

    const globe = new Globe(10.0);
    globe.addGrid(20);
    const globeObject = globe.get3dObject();
    this.state.scene.add(toRaw(globeObject));
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

    this.state = {
      width,
      height,
      camera,
      controls,
      scene,
      renderer,
    };
  }
}
</script>
