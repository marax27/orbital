import { Vue } from 'vue-class-component';
import * as THREE from 'three';

export default class GeoJsonMixin extends Vue {
  private xValues: number[] = [];

  private yValues: number[] = [];

  private zValues: number[] = [];

  public async populateWithGeoJsonData(
    radius: number, shape: string, container: THREE.Object3D,
  ): Promise<void> {
    const materialOptions = { color: 0x00dd00 };

    const geoJson = await fetch('/world_mediumres.json')
      .then((data) => data.json());

    const jsonGeom = GeoJsonMixin.createGeometryArray(geoJson);
    const convertCoordinates = this.getConversionFunctionName(shape);
    let coordinateArray = [];
    const M = materialOptions;

    for (let geomNum = 0; geomNum < jsonGeom.length; geomNum += 1) {
      if (jsonGeom[geomNum].type === 'Point') {
        convertCoordinates(jsonGeom[geomNum].coordinates, radius);
        GeoJsonMixin.drawParticle(this.xValues[0], this.yValues[0], this.zValues[0], M, container);
      } else if (jsonGeom[geomNum].type === 'MultiPoint') {
        for (let pointNum = 0; pointNum < jsonGeom[geomNum].coordinates.length; pointNum += 1) {
          convertCoordinates(jsonGeom[geomNum].coordinates[pointNum], radius);
          const C = container;
          GeoJsonMixin.drawParticle(this.xValues[0], this.yValues[0], this.zValues[0], M, C);
        }
      } else if (jsonGeom[geomNum].type === 'LineString') {
        coordinateArray = this.createCoordinateArray(jsonGeom[geomNum].coordinates);

        for (let pointNum = 0; pointNum < coordinateArray.length; pointNum += 1) {
          convertCoordinates(coordinateArray[pointNum], radius);
        }
        this.draw3dLine(materialOptions, container);
      } else if (jsonGeom[geomNum].type === 'Polygon') {
        const { coordinates } = jsonGeom[geomNum];
        for (let segmentNum = 0; segmentNum < coordinates.length; segmentNum += 1) {
          coordinateArray = this.createCoordinateArray(coordinates[segmentNum]);

          for (let pointNum = 0; pointNum < coordinateArray.length; pointNum += 1) {
            convertCoordinates(coordinateArray[pointNum], radius);
          }
          this.draw3dLine(materialOptions, container);
        }
      } else if (jsonGeom[geomNum].type === 'MultiLineString') {
        const { coordinates } = jsonGeom[geomNum];
        for (let segmentNum = 0; segmentNum < coordinates.length; segmentNum += 1) {
          coordinateArray = this.createCoordinateArray(coordinates[segmentNum]);

          for (let pointNum = 0; pointNum < coordinateArray.length; pointNum += 1) {
            convertCoordinates(coordinateArray[pointNum], radius);
          }
          this.draw3dLine(materialOptions, container);
        }
      } else if (jsonGeom[geomNum].type === 'MultiPolygon') {
        for (let polyNum = 0; polyNum < jsonGeom[geomNum].coordinates.length; polyNum += 1) {
          const coordinates = jsonGeom[geomNum].coordinates[polyNum];
          for (let segmentNum = 0; segmentNum < coordinates.length; segmentNum += 1) {
            coordinateArray = this.createCoordinateArray(coordinates[segmentNum]);

            for (let pointNum = 0; pointNum < coordinateArray.length; pointNum += 1) {
              convertCoordinates(coordinateArray[pointNum], radius);
            }
            this.draw3dLine(materialOptions, container);
          }
        }
      } else {
        throw new Error('The geoJSON is not valid.');
      }
    }
  }

  private static createGeometryArray(json: any) {
    const geometryArray = [];

    if (json.type === 'Feature') {
      geometryArray.push(json.geometry);
    } else if (json.type === 'FeatureCollection') {
      for (let featureNum = 0; featureNum < json.features.length; featureNum += 1) {
        geometryArray.push(json.features[featureNum].geometry);
      }
    } else if (json.type === 'GeometryCollection') {
      for (let geomNum = 0; geomNum < json.geometries.length; geomNum += 1) {
        geometryArray.push(json.geometries[geomNum]);
      }
    } else {
      throw new Error('The geoJSON is not valid.');
    }
    return geometryArray;
  }

  private getConversionFunctionName(shape: any) {
    let conversionFunctionName;

    if (shape === 'sphere') {
      conversionFunctionName = this.convertToSphereCoords;
    } else if (shape === 'plane') {
      conversionFunctionName = this.convertToPlaneCoords;
    } else {
      throw new Error('The shape that you specified is not valid.');
    }
    return conversionFunctionName;
  }

  private createCoordinateArray(feature: any) {
    // Loop through the coordinates and figure out if the points need interpolation.
    const tempArray = [];
    let interpolationArray = [];

    for (let pointNum = 0; pointNum < feature.length; pointNum += 1) {
      const point1 = feature[pointNum];
      const point2 = feature[pointNum - 1];

      if (pointNum > 0) {
        if (GeoJsonMixin.needsInterpolation(point2, point1)) {
          interpolationArray = [point2, point1];
          interpolationArray = this.interpolatePoints(interpolationArray);

          for (let idx = 0; idx < interpolationArray.length; idx += 1) {
            tempArray.push(interpolationArray[idx]);
          }
        } else {
          tempArray.push(point1);
        }
      } else {
        tempArray.push(point1);
      }
    }
    return tempArray;
  }

  private static needsInterpolation(point2: any, point1: any) {
    // If the distance between two latitude and longitude values is
    // greater than five degrees, return true.
    const lon1 = point1[0];
    const lat1 = point1[1];
    const lon2 = point2[0];
    const lat2 = point2[1];
    const lonDistance = Math.abs(lon1 - lon2);
    const latDistance = Math.abs(lat1 - lat2);

    return (lonDistance > 5 || latDistance > 5);
  }

  private interpolatePoints(interpolationArray: any): any {
    // This function is recursive. It will continue to add midpoints to the
    // interpolation array until needsInterpolation() returns false.
    let tempArray = [];
    let point1;
    let point2;

    for (let pointNum = 0; pointNum < interpolationArray.length - 1; pointNum += 1) {
      point1 = interpolationArray[pointNum];
      point2 = interpolationArray[pointNum + 1];

      if (GeoJsonMixin.needsInterpolation(point2, point1)) {
        tempArray.push(point1);
        tempArray.push(GeoJsonMixin.getMidpoint(point1, point2));
      } else {
        tempArray.push(point1);
      }
    }

    tempArray.push(interpolationArray[interpolationArray.length - 1]);

    if (tempArray.length > interpolationArray.length) {
      tempArray = this.interpolatePoints(tempArray);
    } else {
      return tempArray;
    }
    return tempArray;
  }

  private static getMidpoint(point1: any, point2: any) {
    const midpointLon = (point1[0] + point2[0]) / 2;
    const midpointLat = (point1[1] + point2[1]) / 2;
    const midpoint = [midpointLon, midpointLat];

    return midpoint;
  }

  private convertToSphereCoords(coordinatesArray: number[], sphereRadius: number): void {
    const lon = coordinatesArray[0];
    const lat = coordinatesArray[1];
    const toRad = Math.PI / 180;

    this.xValues.push(Math.cos(lat * toRad) * Math.cos(lon * toRad) * sphereRadius);
    this.yValues.push(Math.sin(lat * toRad) * sphereRadius);
    this.zValues.push(-Math.cos(lat * toRad) * Math.sin(lon * toRad) * sphereRadius);
  }

  private convertToPlaneCoords(coordinatesArray: number[], radius: number): void {
    const lon = coordinatesArray[0];
    const lat = coordinatesArray[1];

    this.zValues.push((lat / 180) * radius);
    this.yValues.push((lon / 180) * radius);
  }

  private static drawParticle(
    x: number, y: number, z: number, options: any, container: THREE.Object3D,
  ): void {
    /* const vertices = [];
    vertices.push(new THREE.Vector3(x, y, z));
    var particle_geom = new THREE.BufferGeometry().setFromPoints(vertices);

    var particle_material = new THREE.ParticleSystemMaterial(options);

    var particle = new THREE.ParticleSystem(particle_geom, particle_material);
    container.add(particle);

    this.clearArrays(); */

    console.error('Cannot render a particle: unsupported three.js features.');
  }

  private draw3dLine(options: any, container: THREE.Object3D): void {
    const vertices = GeoJsonMixin.createVerticesForPoints(this.xValues, this.yValues, this.zValues);
    const lineGeom = new THREE.BufferGeometry().setFromPoints(vertices);

    const lineMaterial = new THREE.LineBasicMaterial(options);
    const line = new THREE.Line(lineGeom, lineMaterial);
    container.add(line);

    this.clearArrays();
  }

  private static createVerticesForPoints(
    valuesAxis1: number[], valuesAxis2: number[], valuesAxis3: number[],
  ): THREE.Vector3[] {
    const result = [];
    for (let i = 0; i < valuesAxis1.length; i += 1) {
      result.push(new THREE.Vector3(valuesAxis1[i],
        valuesAxis2[i], valuesAxis3[i]));
    }
    return result;
  }

  private clearArrays(): void {
    this.xValues.length = 0;
    this.yValues.length = 0;
    this.zValues.length = 0;
  }
}
