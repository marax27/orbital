import { Vue } from 'vue-class-component';
import * as THREE from 'three';

export default class GeoJsonMixin extends Vue {
  private xValues: number[] = [];

  private yValues: number[] = [];

  private zValues: number[] = [];

  public async populateWithGeoJsonData(radius: number, shape: string, container: THREE.Object3D): Promise<void> {
    const materalOptions = { color: 0x00dd00 };

    const geoJson = await fetch('/world_mediumres.json')
      .then((data) => data.json());

    const jsonGeom = this.createGeometryArray(geoJson);
    const convertCoordinates = this.getConversionFunctionName(shape);
    let coordinate_array = [];

    for (var geom_num = 0; geom_num < jsonGeom.length; geom_num++) {

      if (jsonGeom[geom_num].type == 'Point') {
        convertCoordinates(jsonGeom[geom_num].coordinates, radius);
        this.drawParticle(this.xValues[0], this.yValues[0], this.zValues[0], materalOptions, container);

      } else if (jsonGeom[geom_num].type == 'MultiPoint') {
        for (var point_num = 0; point_num < jsonGeom[geom_num].coordinates.length; point_num++) {
          convertCoordinates(jsonGeom[geom_num].coordinates[point_num], radius);
          this.drawParticle(this.xValues[0], this.yValues[0], this.zValues[0], materalOptions, container);
        }

      } else if (jsonGeom[geom_num].type == 'LineString') {
        coordinate_array = this.createCoordinateArray(jsonGeom[geom_num].coordinates);

        for (var point_num = 0; point_num < coordinate_array.length; point_num++) {
          convertCoordinates(coordinate_array[point_num], radius);
        }
        this.draw3dLine(this.xValues, this.yValues, this.zValues, materalOptions, container);

      } else if (jsonGeom[geom_num].type == 'Polygon') {
        for (var segment_num = 0; segment_num < jsonGeom[geom_num].coordinates.length; segment_num++) {
          coordinate_array = this.createCoordinateArray(jsonGeom[geom_num].coordinates[segment_num]);

          for (var point_num = 0; point_num < coordinate_array.length; point_num++) {
            convertCoordinates(coordinate_array[point_num], radius);
          }
          this.draw3dLine(this.xValues, this.yValues, this.zValues, materalOptions, container);
        }

      } else if (jsonGeom[geom_num].type == 'MultiLineString') {
        for (var segment_num = 0; segment_num < jsonGeom[geom_num].coordinates.length; segment_num++) {
          coordinate_array = this.createCoordinateArray(jsonGeom[geom_num].coordinates[segment_num]);

          for (var point_num = 0; point_num < coordinate_array.length; point_num++) {
            convertCoordinates(coordinate_array[point_num], radius);
          }
          this.draw3dLine(this.xValues, this.yValues, this.zValues, materalOptions, container);
        }

      } else if (jsonGeom[geom_num].type == 'MultiPolygon') {
        for (var polygon_num = 0; polygon_num < jsonGeom[geom_num].coordinates.length; polygon_num++) {
          for (var segment_num = 0; segment_num < jsonGeom[geom_num].coordinates[polygon_num].length; segment_num++) {
            coordinate_array = this.createCoordinateArray(jsonGeom[geom_num].coordinates[polygon_num][segment_num]);

            for (var point_num = 0; point_num < coordinate_array.length; point_num++) {
              convertCoordinates(coordinate_array[point_num], radius);
            }
            this.draw3dLine(this.xValues, this.yValues, this.zValues, materalOptions, container);
          }
        }
      } else {
        throw new Error('The geoJSON is not valid.');
      }
    }
  }

  private createGeometryArray(json: any) {
    var geometry_array = [];

    if (json.type == 'Feature') {
        geometry_array.push(json.geometry);
    } else if (json.type == 'FeatureCollection') {
        for (var feature_num = 0; feature_num < json.features.length; feature_num++) {
            geometry_array.push(json.features[feature_num].geometry);
        }
    } else if (json.type == 'GeometryCollection') {
        for (var geom_num = 0; geom_num < json.geometries.length; geom_num++) {
            geometry_array.push(json.geometries[geom_num]);
        }
    } else {
        throw new Error('The geoJSON is not valid.');
    }
    //alert(geometry_array.length);
    return geometry_array;
  }

  private getConversionFunctionName(shape: any) {
    var conversionFunctionName;

    if (shape == 'sphere') {
        conversionFunctionName = this.convertToSphereCoords;
    } else if (shape == 'plane') {
        conversionFunctionName = this.convertToPlaneCoords;
    } else {
        throw new Error('The shape that you specified is not valid.');
    }
    return conversionFunctionName;
  }

  private createCoordinateArray(feature: any) {
    //Loop through the coordinates and figure out if the points need interpolation.
    var temp_array = [];
    var interpolation_array = [];

    for (var point_num = 0; point_num < feature.length; point_num++) {
        var point1 = feature[point_num];
        var point2 = feature[point_num - 1];

        if (point_num > 0) {
            if (this.needsInterpolation(point2, point1)) {
                interpolation_array = [point2, point1];
                interpolation_array = this.interpolatePoints(interpolation_array);

                for (var inter_point_num = 0; inter_point_num < interpolation_array.length; inter_point_num++) {
                    temp_array.push(interpolation_array[inter_point_num]);
                }
            } else {
                temp_array.push(point1);
            }
        } else {
            temp_array.push(point1);
        }
    }
    return temp_array;
  }

  private needsInterpolation(point2: any, point1: any) {
      //If the distance between two latitude and longitude values is
      //greater than five degrees, return true.
      var lon1 = point1[0];
      var lat1 = point1[1];
      var lon2 = point2[0];
      var lat2 = point2[1];
      var lon_distance = Math.abs(lon1 - lon2);
      var lat_distance = Math.abs(lat1 - lat2);

      if (lon_distance > 5 || lat_distance > 5) {
          return true;
      } else {
          return false;
      }
  }

  private interpolatePoints(interpolation_array: any): any {
    //This function is recursive. It will continue to add midpoints to the
    //interpolation array until needsInterpolation() returns false.
    var temp_array = [];
    var point1, point2;

    for (var point_num = 0; point_num < interpolation_array.length - 1; point_num++) {
      point1 = interpolation_array[point_num];
      point2 = interpolation_array[point_num + 1];

      if (this.needsInterpolation(point2, point1)) {
        temp_array.push(point1);
        temp_array.push(this.getMidpoint(point1, point2));
      } else {
        temp_array.push(point1);
      }
    }

    temp_array.push(interpolation_array[interpolation_array.length - 1]);

    if (temp_array.length > interpolation_array.length) {
      temp_array = this.interpolatePoints(temp_array);
    } else {
      return temp_array;
    }
    return temp_array;
  }

  private getMidpoint(point1: any, point2: any) {
    var midpoint_lon = (point1[0] + point2[0]) / 2;
    var midpoint_lat = (point1[1] + point2[1]) / 2;
    var midpoint = [midpoint_lon, midpoint_lat];

    return midpoint;
  }

  private convertToSphereCoords(coordinates_array: any, sphere_radius: number) {
      var lon = coordinates_array[0];
      var lat = coordinates_array[1];

      this.xValues.push(Math.cos(lat * Math.PI / 180) * Math.cos(lon * Math.PI / 180) * sphere_radius);
      this.yValues.push(Math.sin(lat * Math.PI / 180) * sphere_radius);
      this.zValues.push(-Math.cos(lat * Math.PI / 180) * Math.sin(lon * Math.PI / 180) * sphere_radius);
  }

  private convertToPlaneCoords(coordinates_array: any[], radius: number): any {
      var lon = coordinates_array[0];
      var lat = coordinates_array[1];

      this.zValues.push((lat / 180) * radius);
      this.yValues.push((lon / 180) * radius);
  }

  private drawParticle(x: number, y: number, z: number, options: any, container: THREE.Object3D): void {
      /* const vertices = [];
      vertices.push(new THREE.Vector3(x, y, z));
      var particle_geom = new THREE.BufferGeometry().setFromPoints(vertices);

      var particle_material = new THREE.ParticleSystemMaterial(options);

      var particle = new THREE.ParticleSystem(particle_geom, particle_material);
      container.add(particle);

      this.clearArrays(); */

      console.error('Cannot render a particle: unsupported three.js features.');
  }

  private draw3dLine(xValues: any[], yValues: any[], zValues: any[], options: any, container: THREE.Object3D): void {
      const vertices = this.createVertexForEachPoint(this.xValues, this.yValues, this.zValues);
      var line_geom = new THREE.BufferGeometry().setFromPoints(vertices);

      var line_material = new THREE.LineBasicMaterial(options);
      var line = new THREE.Line(line_geom, line_material);
      container.add(line);

      this.clearArrays();
  }

  private createVertexForEachPoint(values_axis1: any, values_axis2: any, values_axis3: any) {
      const result = [];
      for (var i = 0; i < values_axis1.length; i++) {
          result.push(new THREE.Vector3(values_axis1[i],
              values_axis2[i], values_axis3[i]));
      }
      return result;
  }

  private clearArrays(): void {
    this.xValues.length = 0;
    this.yValues.length = 0;
    this.zValues.length = 0;
  }
}
