<template>
  <div class="orbital-viewport"></div>
</template>

<script lang="ts">
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import Globe from '../visualisation/globe';
import GeoJsonMixin from '../visualisation/geoJson.mixin';
import throttle from '../utilities/throttle';

interface ViewPortState {
  width: number;
  height: number;
  camera: THREE.Camera;
  controls: OrbitControls;
  scene: THREE.Scene;
  renderer: THREE.Renderer;
  raycaster: THREE.Raycaster;
}

interface IMouseState {
  position: THREE.Vector2;
}

export default class OrbitalViewPort extends GeoJsonMixin {
  private readonly mouseEventThrottlingDelayMs = 100;

  // This is a reactive version that's messing with rendering framerate.
  // state: ViewPortState | null = null;
  state!: ViewPortState;

  mouseState!: IMouseState;

  globe!: Globe;

  globeObject!: THREE.Object3D;

  stats!: Stats;

  created() {
    this.mouseState = { position: new THREE.Vector2(0, 0) };
  }

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
    S.renderer.render(S.scene, S.camera);
    this.stats.end();

    window.requestAnimationFrame(this.animate);
  }

  private initialiseGlobe(): THREE.Object3D {
    if (this.state == null) {
      throw new Error('Failed to initialise globe: Viewport state not initialised.');
    }

    this.globe = new Globe(10.0);
    this.globe.addGrid(20);
    const globeObject = this.globe.get3dObject();
    this.state.scene.add(globeObject);
    return globeObject;
  }

  private initialiseViewPort(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    this.$el.appendChild(renderer.domElement);

    this.initialiseMouseEvents(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.5, 1000);
    camera.position.z = -20;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 10.5;

    const raycaster = new THREE.Raycaster();

    this.state = {
      width,
      height,
      camera,
      controls,
      scene,
      renderer,
      raycaster,
    };
  }

  private initialiseMouseEvents(rendererElement: HTMLCanvasElement): void {
    const delay = this.mouseEventThrottlingDelayMs;

    // Mouse-up is more meaningful than click in this case - it doesn't matter how much
    // you move a mouse around inside a viewport, only the end position matters.
    rendererElement.addEventListener('mouseup', this.onMouseUp);
    rendererElement.addEventListener('mousemove', throttle(this.onMouseMove, delay));
  }

  public onMouseUp(event: MouseEvent): void {
    const S = this.state;
    this.updateMousePosition(event.clientX, event.clientY);
    S.raycaster.setFromCamera(this.mouseState.position, S.camera);

    const intersects = S.raycaster.intersectObject(this.globe.getSurfaceMesh(), false);
    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      const coordinates = this.globe.getSphericalCoordinates(hitPoint);
    }
  }

  public onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event.clientX, event.clientY);
  }

  private updateMousePosition(x: number, y: number): void {
    this.mouseState.position.x = (x / this.state.renderer.domElement.clientWidth) * 2 - 1;
    this.mouseState.position.y = -(y / this.state.renderer.domElement.clientHeight) * 2 + 1;
  }
}
</script>
