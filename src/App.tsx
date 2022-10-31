import { useEffect, useRef, useState } from "react";
import { GameMap, getBoundsFromCircle, LatLngLiteral } from "./GameMap";
import styles from "./App.module.css";
import vehicles from "./data.json";
import { useGoogleMaps } from "./googlemaps";
import { useDay } from "./utils";
import logo from "./hyrdle.svg";

import seedrandom from "seedrandom";

const App = () => {
  const { dayOffset, currentDay, todaysIndex } = useDay();

  const { maps } = useGoogleMaps();

  const [hasLoaded, setHasLoaded] = useState(false);

  const makeLocalStorageKey = (key: string) =>
    `hyrdle.xyz:${todaysIndex}:${key}`;

  const [hasShared, setHasShared] = useState(false);
  const mapRef = useRef<any>(null);
  const currentVehicle = vehicles[todaysIndex];
  const answerPoint = {
    lat: currentVehicle.point[1],
    lng: currentVehicle.point[0],
  };

  const [markers, setMarkers] = useState<
    {
      lat: number;
      lng: number;
    }[]
  >([]);
  const [marker, setMarker] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const circles = [
    {
      center: { lat: 59.95, lng: 10.5 },
      radius: 600000,
    },
  ];
  const [level, setLevel] = useState(0);
  if (maps) {
    const random = seedrandom(todaysIndex + "circles");
    let newRadius = 60000
    while (newRadius >= 25) {
      const previousCircle = circles[circles.length - 1];
      /* Find random point in circle with radius away from real answer. That point is now the circle's new midpoint. */
      newRadius = Math.pow(previousCircle.radius, 0.95);
      const r = newRadius * Math.sqrt(random() * 0.9);
      const theta = random() * 360;
      const latLng = maps.geometry.spherical
        .computeOffset(answerPoint, r, theta)
        .toJSON();
      circles.push({ center: latLng, radius: newRadius });
    }
  }

  const [gameState, setGameState] = useState<"playing" | "win" | "lose">(
    "playing"
  );
  const round = markers.length;

  const circle = circles[level];

  const fitMapToCircleBounds = ({
    center,
    radius,
  }: {
    center: LatLngLiteral;
    radius: number;
  }) => {
    const bounds = getBoundsFromCircle({ center, radius });
    mapRef.current.fitBounds(bounds, 16);
  };

  const distance =
    (marker && answerPoint
      ? window.google?.maps.geometry.spherical.computeDistanceBetween(
          answerPoint,
          marker
        )
      : -1) | 0;

  const endGame = (state: "win" | "lose", marker: LatLngLiteral) => {
    setGameState(state);
    const dLng = marker.lng - answerPoint.lng;
    const dLat = marker.lat - answerPoint.lat;
    const bounds = {
      north: Math.max(answerPoint.lat - dLat, answerPoint.lat + dLat),
      south: Math.min(answerPoint.lat - dLat, answerPoint.lat + dLat),
      east: Math.max(answerPoint.lng - dLng, answerPoint.lng + dLng),
      west: Math.min(answerPoint.lng - dLng, answerPoint.lng + dLng),
    };
    if (mapRef.current) {
      mapRef.current?.fitBounds(bounds, 32);
    }
  };

  /* Load previous state from local storage */
  useEffect(() => {
    if (!maps) {
      return;
    }
    setHasLoaded(true);
    const markers = JSON.parse(
      localStorage.getItem(makeLocalStorageKey("markers")) || "[]"
    );
    const level = JSON.parse(
      localStorage.getItem(makeLocalStorageKey("level")) || "0"
    )
    if (markers.length) {
      setMarkers(markers);
      if (markers.length < 5) {
        fitMapToCircleBounds(circles[level]);
      }
      const value = evaluateWinCondition(
        answerPoint,
        markers[markers.length - 1],
        markers.length,
        level,
        maps
      );
      if (value === "win" || value === "lose") {
        setMarker(markers[markers.length - 1]);
        endGame(value, markers[markers.length - 1]);
      }
    }
  }, [maps]);

  const isGameDone = gameState === "win" || gameState === "lose";

  const evaluateWinCondition = (
    correctAnswer: LatLngLiteral,
    currentGuess: LatLngLiteral,
    round: number,
    level: number,
    maps: typeof google.maps
  ) => {
    const guessedDistance = maps.geometry.spherical.computeDistanceBetween(
      correctAnswer,
      currentGuess,
    );
    if (guessedDistance < 50) {
      return "win";
    }
    if (round >= 4) {
      return "lose";
    }

    // To get the next level, we want to shrink the circle until the first one that satisfies:
    // 1) The radius is smaller than our guess distance (so that a good guess gives a small circle)
    // 2) The guess is outside of the circle (so that it feels like you have tightened the area)
    let newLevel = circles.findIndex(it => {
      const circleIsSmallerThanGuessDistance = it.radius <= guessedDistance;
      const distanceFromCenterOfCircle = maps.geometry.spherical.computeDistanceBetween(
        it.center,
        currentGuess,
      );
      const circleDoesNotContainGuess = distanceFromCenterOfCircle >= it.radius;
      return circleIsSmallerThanGuessDistance && circleDoesNotContainGuess;
    })
    // If this somehow doesn't exist (should never happen, because you would have won), we fall back to the smallest one
    if (newLevel === -1) {
      newLevel = circles.length - 1;
    }
    // If you have managed to make a guess that isn't even good enough to shrink the circle by two sizes,
    // we nudge you to a noticably smaller circle. (e.g. if you guess at the very other end of the circle)
    if (newLevel <= level + 1) {
      newLevel = level + 2;
    }

    return newLevel;
  };

  const makeGuess = (marker: LatLngLiteral) => {

    //@ts-expect-error
    const geometry = maps.geometry;

    if (marker !== null && markers.length < 5) {
      const newMarkers = [...markers, marker];
      localStorage.setItem(
        makeLocalStorageKey("markers"),
        JSON.stringify(newMarkers)
      );
      setMarkers(newMarkers);
    }
    if (!maps) {
      return;
    }
    const nextGameState = evaluateWinCondition(
      answerPoint,
      marker,
      round,
      level,
      maps
    );
    if (nextGameState === "win" || nextGameState === "lose") {
      endGame(nextGameState, marker);
      return;
    } else {
      const newLevel = nextGameState;
      localStorage.setItem(
        makeLocalStorageKey("level"),
        JSON.stringify(newLevel)
      )
      setLevel(newLevel);
      fitMapToCircleBounds(circles[nextGameState]);
    }
  };

  return (
    <div
      style={{
        background: "#1c5dff",
        minHeight: "100vh",
        color: "white",
        fontSize: "white",
        lineHeight: "1.5",
        fontFamily:
          '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 640 + 16 * 2,
          width: "100%",
          margin: "0 auto",
          background: "#1c5dff",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "block",
            marginTop: 32,
            marginBottom: 32,
          }}
        >
          <img width={168} height={26} src={logo} alt="Hyrdle" />
        </div>
        <div
          style={{
            transition: "all 0.15s ease-out",
            opacity: hasLoaded ? 1 : 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {!isGameDone && (
            <div style={{ marginBottom: 32 }}>
              Where is today&apos;s car? Find it on the map!
            </div>
          )}
          {!isGameDone && (
            <div
              style={{
                boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.16)",
                width: "100%",
                aspectRatio: (16 / 9).toString(),
                borderRadius: 16,
                background: `#888 url(${currentVehicle.image.replace(
                  "__cover_640x480.jpg",
                  "__cover_1920x1080.jpg"
                )}) no-repeat center / contain`,
              }}
            />
          )}

          {!isGameDone && (
            <div style={{ marginTop: 32 }}>
              The car is somewhere within the blue circle. This is guess number{" "}
              {round + 1}. You have {5 - round} attempts remaining.
            </div>
          )}

          <div
            style={{
              width: "100%",
              boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.06)",
              height: 480,
              marginTop: 32,
              borderRadius: 16,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <GameMap
              key="1"
              onMap={(map) => (mapRef.current = map)}
              circle={isGameDone ? null : circle}
              marker={marker || undefined}
              carMarker={isGameDone ? answerPoint : undefined}
              onChange={(latLng) => {
                if (!isGameDone) {
                  setMarker(latLng);
                }
              }}
            />
          </div>
          {!isGameDone && marker && (
            <button
              className={styles.guessButton}
              style={{ marginTop: -64 - 16, marginBottom: 32 }}
              onClick={() => makeGuess(marker)}
            >
              Make a guess
            </button>
          )}
          {isGameDone && (
            <div
              style={{
                marginTop: 32,
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
              }}
            >
              <div style={{ marginBottom: 32 }}>
                Your guess was <strong>{distance}m</strong> away from the car.
              </div>
              <button
                className={styles.guessButton}
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Hyrdle #${todaysIndex}
                ${[...new Array(5)]
                  .map((_, i) => {
                    if (i === round - 1) {
                      return gameState === "lose" ? "🟥" : "🟩";
                    }
                    if (i <= round - 1) {
                      return "🟥";
                    }
                    return "⬛";
                  })
                  .join("")} ${distance}m
                https://hyrdle.xyz`
                      .split("\n")
                      .map((x) => x.trim())
                      .join("\n")
                  );
                  setHasShared(true);
                }}
              >
                {hasShared ? "Copied!" : "Share"}
              </button>
              <div
                style={{
                  marginTop: 32,
                  fontWeight: "bold",
                  background: "#ffffff",
                  padding: "16px 32px",
                  borderRadius: 16,
                  color: "#000130",
                }}
              >
                <div>Hyrdle #{todaysIndex}</div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {[...new Array(5)].map((_, i) => (
                    <span key={i} style={{ padding: 2 }}>
                      {(() => {
                        if (i === round - 1) {
                          return gameState === "lose" ? "🟥" : "🟩";
                        }
                        if (i <= round - 1) {
                          return "🟥";
                        }
                        return "⬛";
                      })()}
                    </span>
                  ))}
                  <strong style={{ paddingLeft: 6 }}>{distance}m</strong>
                </div>
                <div>https://hyrdle.xyz</div>
              </div>

              <a
                href={`https://link.hyre.no/h?communityvehiclestation=${currentVehicle.id}`}
                style={{ marginTop: 32, textDecoration: "underline" }}
              >
                Open in the Hyre app.
              </a>
            </div>
          )}
        </div>
        <div style={{ height: 128 }} />
      </div>
    </div>
  );
};

export default App;
