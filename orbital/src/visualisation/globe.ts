/* eslint-disable max-classes-per-file */

import * as THREE from 'three';

export interface ISphericalCoordinates {
  latitude: number;
  longitude: number;
}

export interface ICartesianCoordinates {
  x: number;
  y: number;
  z: number;
}

export class CoordinateConversion {
  public static toCartesian(point: ISphericalCoordinates, radius: number): ICartesianCoordinates {
    const R = radius;
    const toRad = Math.PI / 180.0;
    const radLat = point.latitude * toRad;
    const radLon = point.longitude * toRad;
    const x = R * Math.cos(radLat) * Math.cos(radLon);
    const y = R * Math.sin(radLat);
    const z = -R * Math.cos(radLat) * Math.sin(radLon);
    return { x, y, z };
  }

  public static toSpherical(point: ICartesianCoordinates, radius: number): ISphericalCoordinates {
    const toDeg = 180.0 / Math.PI;
    const longitude = Math.atan2(point.x, point.z) * toDeg - 90.0;
    return {
      latitude: Math.asin(point.y / radius) * toDeg,
      longitude: longitude < -180.0 ? longitude + 360.0 : longitude,
    };
  }
}

export default class Globe {
  constructor(public readonly radius: number) {}

  private presentationMesh: THREE.Mesh | null = null;

  private surfaceMesh: THREE.Mesh | null = null;

  private planet: THREE.Object3D | null = null;

  private createSphericalGeometry(w: number, h: number): THREE.SphereGeometry {
    return new THREE.SphereGeometry(this.radius, w, h);
  }

  private initialisePresentationMesh(): THREE.Mesh {
    const geometry = this.createSphericalGeometry(10, 10);
    const translucentMaterial = new THREE.MeshBasicMaterial({
      color: 0,
      transparent: true,
      opacity: 0.7,
    });
    this.presentationMesh = new THREE.Mesh(geometry, translucentMaterial);
    return this.presentationMesh;
  }

  private initialiseSurfaceMesh(): THREE.Mesh {
    const geometry = this.createSphericalGeometry(28, 28);
    const material = new THREE.MeshBasicMaterial({
      color: 0,
      transparent: true,
      opacity: 0,
    });
    this.surfaceMesh = new THREE.Mesh(geometry, material);
    return this.surfaceMesh;
  }

  public get3dObject(): THREE.Object3D {
    if (this.planet == null) {
      const planet = new THREE.Object3D();
      planet.add(this.initialisePresentationMesh());
      planet.add(this.initialiseSurfaceMesh());
      this.planet = planet;
    }
    return this.planet;
  }

  public getSurfaceMesh(): THREE.Mesh {
    if (this.surfaceMesh != null) {
      return this.surfaceMesh;
    }
    throw new Error('Surface mesh not initialised.');
  }

  public addGrid(greatCircleCount: number): void {
    const globe = this.get3dObject();
    const linspace = [...Array(greatCircleCount).keys()];
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x005500 });
    const R = this.radius;

    const anglePerPiece = 360.0 / greatCircleCount;

    function createMeridian(longitude: number) {
      const linePoints = linspace
        .map((idx) => idx * anglePerPiece - 180.0)
        .map((latitude) => {
          const point = CoordinateConversion.toCartesian({ latitude, longitude }, R);
          return new THREE.Vector3(point.x, point.y, point.z);
        });
      linePoints.push(linePoints[0]);
      return linePoints;
    }

    function createCircleOfLatitude(latitude: number) {
      const linePoints = linspace
        .map((idx) => idx * anglePerPiece)
        .map((longitude) => {
          const point = CoordinateConversion.toCartesian({ latitude, longitude }, R);
          return new THREE.Vector3(point.x, point.y, point.z);
        });
      linePoints.push(linePoints[0]);
      return linePoints;
    }

    linspace
      .map((idx) => idx * anglePerPiece)
      .forEach((angle) => {
        const lonGeom = new THREE.BufferGeometry().setFromPoints(createMeridian(angle));
        const meridian = new THREE.Line(lonGeom, lineMaterial);
        globe.add(meridian);
        const latGeom = new THREE.BufferGeometry().setFromPoints(createCircleOfLatitude(angle));
        const circleOfLatitude = new THREE.Line(latGeom, lineMaterial);
        globe.add(circleOfLatitude);
      });
  }

  public getSphericalCoordinates(surfacePoint: ICartesianCoordinates): ISphericalCoordinates {
    return CoordinateConversion.toSpherical(surfacePoint, this.radius);
  }
}
