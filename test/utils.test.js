import test from "node:test";
import assert from "node:assert/strict";

import { deserializeTrack, interpolateByAge, interpolatePoint } from "../src/js/utils.js";

const point = (age, stage = "main_sequence") => ({
  eep: 200 + age,
  age_yr: age,
  mass: 1,
  log_L: age / 10,
  log_Teff: 3.7,
  log_R: 0,
  log_g: 4.4,
  center_h1: 0.7 - age / 100,
  center_he4: 0.28 + age / 100,
  mist_phase: 0,
  stage
});

test("interpolatePoint interpolates numeric fields and uses the nearest stage", () => {
  const result = interpolatePoint(point(0, "pms"), point(10, "main_sequence"), 0.75);
  assert.equal(result.age_yr, 7.5);
  assert.equal(result.log_L, 0.75);
  assert.equal(result.stage, "main_sequence");
});

test("interpolateByAge finds the enclosing points", () => {
  const result = interpolateByAge([point(0), point(10), point(30)], 20);
  assert.equal(result.age_yr, 20);
  assert.equal(result.log_L, 2);
});

test("deserializeTrack expands columnar data and derives its age range", () => {
  const columns = Object.keys(point(0));
  const points = [point(2), point(8, "subgiant_red_giant")];
  const track = deserializeTrack({
    slug: "test",
    columns,
    data: points.map((item) => columns.map((column) => item[column]))
  });

  assert.equal(track.slug, "test");
  assert.equal(track.points[1].stage, "subgiant_red_giant");
  assert.equal(track.minAge, 2);
  assert.equal(track.maxAge, 8);
});

test("deserializeTrack rejects malformed and unsorted data", () => {
  assert.throws(() => deserializeTrack({ columns: ["age_yr"], data: [[1]] }), /missing columns/);
  assert.throws(() => deserializeTrack({ points: [point(10), point(5)] }), /not sorted/);
});
