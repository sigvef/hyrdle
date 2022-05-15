import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";

const mapsPromise = new Promise<typeof google.maps>((resolve) => {
  const loader = new Loader({
    apiKey: "AIzaSyA9Tn60TJL-ZA8o8EXw7-ZHQaLZzOQ4VYg",
    version: "weekly",
    libraries: ["geometry"],
  });

  loader.load().then(() => {
    resolve(google.maps);
  });
});

export const useGoogleMaps = () => {
  const [maps, setMaps] = useState<typeof google.maps | null>(null);
  useEffect(() => {
    mapsPromise.then(setMaps);
  }, []);
  return { maps, mapsPromise };
};
