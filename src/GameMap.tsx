import { useEffect, useId, useRef, useState } from "react";
import { useGoogleMaps } from "./googlemaps";

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface GameMapProps {
  marker?: LatLngLiteral;
  carMarker?: LatLngLiteral;
  circle?: { radius: number; center: LatLngLiteral } | null;
  onChange?: (latLng: LatLngLiteral) => void;
  onMap: (map: google.maps.Map) => void;
}

const lineSymbol = {
  path: "M 0,-1 0,1",
  strokeColor: "#000130",
  strokeOpacity: 0.8,
  scale: 4,
};

interface CircleLiteral {
  center: LatLngLiteral;
  radius: number;
}

export const getBoundsFromCircle = ({ center, radius }: CircleLiteral) => {
  const maps = window.google.maps;
  return {
    north: maps.geometry.spherical.computeOffset(center, radius, 0).lat(),
    east: maps.geometry.spherical.computeOffset(center, radius, 90).lng(),
    south: maps.geometry.spherical.computeOffset(center, radius, 180).lat(),
    west: maps.geometry.spherical.computeOffset(center, radius, 270).lng(),
  };
};

export const GameMap = (props: GameMapProps) => {
  const { mapsPromise } = useGoogleMaps();
  const id = "map";
  const circleObj = useRef<google.maps.Circle | null>();
  const carMarkerObj = useRef<google.maps.Marker | null>();
  const markerObj = useRef<google.maps.Marker | null>();
  const polylineObj = useRef<google.maps.Polyline | null>();
  const [mapPromise] = useState<Promise<google.maps.Map>>(
    () =>
      new Promise(async (resolve) => {
        const maps = await mapsPromise;
        const div = document.getElementById(id)!;
        const map = new (await mapsPromise).Map(div, {
          center: { lat: 59.95, lng: 10.5 },
          zoom: 5,
          gestureHandling: "greedy",
        });
        props.onMap(map);
        resolve(map);
      })
  );

  useEffect(() => {
    const circle = props.circle;
    if (circle) {
      mapsPromise.then((maps) => {
        mapPromise.then((map) => {
          const obj =
            circleObj.current ||
            new maps.Circle({
              strokeColor: "#1c5dff",
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: "#1c5dff",
              fillOpacity: 0.1,
              zIndex: 1,
            });
          if (!circleObj.current) {
            obj.addListener("click", (e: any) =>
              props.onChange?.(e.latLng.toJSON())
            );
          }
          circleObj.current = obj;
          obj.setCenter(circle.center);
          obj.setRadius(circle.radius);
          obj.setMap(map);
        });
      });
    } else {
      circleObj.current?.setMap(null);
    }
  }, [props.circle, mapsPromise, mapPromise]);

  useEffect(() => {
    const carMarker = props.carMarker;
    if (carMarker) {
      mapsPromise.then((maps) => {
        mapPromise.then((map) => {
          const obj = (carMarkerObj.current = carMarkerObj.current || new maps.Marker({ zIndex: 9, icon:{url:'/markers/p-circle.png', scaledSize: new maps.Size(30, 30), anchor: new google.maps.Point(15, 15),
} }));
          obj.setPosition(carMarker);
          obj.setMap(map);
        });
      });
    }
  }, [props.carMarker, mapsPromise, mapPromise]);

  useEffect(() => {
    const marker = props.marker;
    if (marker) {
      mapsPromise.then((maps) => {
        mapPromise.then((map) => {
          const obj =
            markerObj.current ||
            new maps.Marker({ zIndex: 10, draggable: true, icon: {url:'/markers/geo-alt.png', scaledSize: new maps.Size(30, 30),
                            anchor: new google.maps.Point(15, 30),

          }});
          if (!markerObj.current) {
            obj.addListener("dragEnd", (e: any) =>
              props.onChange?.(e.latLng.toJSON())
            );
          }
          markerObj.current = obj;
          obj.setPosition(marker);
          obj.setMap(map);
        });
      });
    } else {
      markerObj.current?.setMap(null);
    }
  }, [props.marker, mapsPromise, mapPromise]);

  useEffect(() => {
    if (props.marker && props.carMarker) {
      mapsPromise.then((maps) => {
        mapPromise.then((map) => {
          const obj =
            polylineObj.current ||
            new maps.Polyline({
              path: [props.carMarker!, props.marker!],
              clickable: false,
              draggable: false,
              editable: false,
              geodesic: true,
              strokeOpacity: 0,
              icons: [
                {
                  icon: lineSymbol,
                  offset: "0",
                  repeat: "20px",
                },
              ],
            });
          polylineObj.current = obj;
          obj.setMap(map);
        });
      });
    } else {
      polylineObj.current?.setMap(null);
    }
  }, [props.marker, props.carMarker, mapsPromise, mapPromise]);

  return (
    <>
      <div
        id={id}
        style={{ width: "100%", height: "100%", background: "#888" }}
      ></div>
      {/*
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      onLoad={(map) => {
        console.log("le load", map);
        map.setCenter({ lat: 59.95, lng: 10.5 });
        map.setZoom(5);
        props.onMapMounted(map);
      }}
      options={{ gestureHandling: "greedy" }}
      onClick={(e) => {
        e.latLng && props.onChange?.(e.latLng.toJSON());
      }}
    >
      {props.carMarker && <Marker position={props.carMarker} />}
      {!!(props.carMarker && props.marker) && (
        <>
          <Polyline
            path={[props.carMarker, props.marker]}
            options={{
              clickable: false,
              draggable: false,
              editable: false,
              geodesic: true,
              strokeOpacity: 0,
              icons: [
                {
                  icon: lineSymbol,
                  offset: "0",
                  repeat: "20px",
                },
              ],
            }}
          />
        </>
      )}
      {props.marker && (
        <Marker
          position={props.marker}
          draggable={!props.carMarker}
          onDragEnd={(e) => e.latLng && props.onChange?.(e.latLng.toJSON())}
        />
      )}
      {props.circle && (
        <Circle
          center={props.circle.center}
          options={{
            strokeColor: "#1c5dff",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#1c5dff",
            fillOpacity: 0.1,
          }}
          radius={props.circle.radius}
          onClick={(e) => {
            e.latLng && props.onChange?.(e.latLng.toJSON());
          }}
        />
      )}
    </GoogleMap>
    */}
    </>
  );
};
