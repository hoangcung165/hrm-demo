package com.hrmdemo.entity.shift;

/** How worked time is rounded to the step of a {@link Shift}: not at all, up, down or to the nearest step. */
public enum RoundingMode {
    NONE,
    UP,
    DOWN,
    NEAREST
}
