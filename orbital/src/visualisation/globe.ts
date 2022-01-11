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

  private mesh: THREE.Mesh | null = null;

  private planet: THREE.Object3D | null = null;

  public getMesh(): THREE.Mesh {
    if (this.mesh == null) {
      const geometry = new THREE.SphereGeometry(this.radius, 10, 10);
      const translucentMaterial = new THREE.MeshBasicMaterial({
        color: 0,
        transparent: true,
        opacity: 0.7,
      });
      this.mesh = new THREE.Mesh(geometry, translucentMaterial);
    }

    return this.mesh;
  }

  public get3dObject(): THREE.Object3D {
    if (this.planet == null) {
      const planet = new THREE.Object3D();
      planet.add(this.getMesh());
      this.planet = planet;
    }
    return this.planet;
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
}
