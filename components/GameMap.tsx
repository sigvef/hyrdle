import {
  withScriptjs,
  withGoogleMap,
  GoogleMap,
  Marker,
  Circle,
  Polyline,
} from "react-google-maps";

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface GameMapProps {
  marker?: LatLngLiteral;
  carMarker?: LatLngLiteral;
  circle?: { radius: number; center: LatLngLiteral } | null;
  onChange?: (latLng: LatLngLiteral) => void;
  onMapMounted: (map: any) => void;
}

const lineSymbol = {
  path: "M 0,-1 0,1",
  strokeColor: "#000130",
  strokeOpacity: 0.8,
  scale: 4,
};

export const GameMap = withScriptjs(
  withGoogleMap((props: GameMapProps) => (
    <GoogleMap
      defaultZoom={5}
      ref={props.onMapMounted}
      defaultCenter={{ lat: 59.95, lng: 10.5 }}
      options={{ gestureHandling: "greedy" }}
      onClick={(e) => {
        props.onChange?.(e.latLng.toJSON());
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
          onDragEnd={(e) => props.onChange?.(e.latLng.toJSON())}
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
            props.onChange?.(e.latLng.toJSON());
          }}
        />
      )}
    </GoogleMap>
  ))
);
