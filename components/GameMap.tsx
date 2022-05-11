import {
  withScriptjs,
  withGoogleMap,
  GoogleMap,
  Marker,
  Circle,
} from "react-google-maps";

export const GameMap = withScriptjs(
  withGoogleMap((props: MapProps) => (
    <GoogleMap
      key="1"
      defaultZoom={5}
      ref={props.onMapMounted}
      defaultCenter={{ lat: 59.95, lng: 10.5 }}
      options={{ gestureHandling: "greedy" }}
      onClick={(e) => {
        props.onChange?.(e.latLng);
      }}
    >
      {props.marker && (
        <Marker
          position={props.marker}
          draggable
          onDragEnd={(e) => props.onChange(e.latLng)}
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
            props.onChange?.(e.latLng);
          }}
        />
      )}
    </GoogleMap>
  ))
);
