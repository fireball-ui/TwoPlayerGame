/**
 * @module SvgRender
 * @file js/modules/SvgRender.js
 * @copyright 2025-06-29 Magnus Dümke
 * @license MIT
 * @author Magnus Dümke
 * @version 1.0.0
 * @since 2025-06-29
 * @description This module provides functions to create SVG elements for rendering a tower,
 * which is a piece on the board that changes its layout at gameplay.
 * It includes functions to create circles and a complete SVG structure for visual representations.
 * @property SVG_NS - The namespace for SVG elements, used to create SVG elements correctly.
 * @exports {function} svgTowerVector - A function that creates and returns an SVG element.
 */

const SVG_NS = "http://www.w3.org/2000/svg";
const classFillColorUser = "fillColorUser";
const classFillColorBot = "fillColorBot";
const classStrokeColor = "strokeColor";
const classFillColorDot = "fillColorDot";

/**
 * Creates an SVGCircleElement element with the specified attributes.
 * @private
 * @param {number} cx - The x-coordinate of the center of the circle.
 * @param {number} cy - The y-coordinate of the center of the circle.
 * @param {number} r - The radius of the circle.
 * @param {string} fillColor - The fill color of the circle (CSS color value).
 * @param {string} strokeColor - The stroke color of the circle (CSS color value).
 * @returns {SVGCircleElement} The created SVG circle element.
 */
function createSvgCircle(cx, cy, r, fillColor, strokeColor = null) {
  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", r);
  circle.classList.add(fillColor);
  if (strokeColor !== null) {
    circle.classList.add(strokeColor);
  }
  return circle;
}

/**
 * Creates an SVGSVGElement element containing various tower vector graphics as grouped <g> elements.
 * Each group represents a different tower configuration, distinguished by stack size, color and a top dot pattern.
 * The groups are initially hidden and can be shown/hidden via their CSS classes.
 *
 * @returns {SVGSVGElement} An SVG element with multiple grouped tower vector graphics.
 */
function createSvgTowerVector() {
  const svgTowerVector = document.createElementNS(SVG_NS, "svg");
  svgTowerVector.setAttribute("viewBox", "0 0 100 100");
  svgTowerVector.setAttribute("width", "100%");
  svgTowerVector.setAttribute("height", "100%");
  const tower_user = document.createElementNS(SVG_NS, "g");
  tower_user.classList.add("svgHide", "svgTower", "tower_user");
  const tower_user_dot = document.createElementNS(SVG_NS, "g");
  tower_user_dot.classList.add("svgHide", "svgTower", "tower_user_dot");
  const tower_user_bot = document.createElementNS(SVG_NS, "g");
  tower_user_bot.classList.add("svgHide", "svgTower", "tower_user_bot");
  const tower_user_bot_dot = document.createElementNS(SVG_NS, "g");
  tower_user_bot_dot.classList.add("svgHide", "svgTower", "tower_user_bot_dot");
  const tower_user_bot_user = document.createElementNS(SVG_NS, "g");
  tower_user_bot_user.classList.add(
    "svgHide",
    "svgTower",
    "tower_user_bot_user"
  );
  const tower_user_bot_user_dot = document.createElementNS(SVG_NS, "g");
  tower_user_bot_user_dot.classList.add(
    "svgHide",
    "svgTower",
    "tower_user_bot_user_dot"
  );
  const tower_user_user_bot = document.createElementNS(SVG_NS, "g");
  tower_user_user_bot.classList.add(
    "svgHide",
    "svgTower",
    "tower_user_user_bot"
  );
  const tower_user_user_bot_dot = document.createElementNS(SVG_NS, "g");
  tower_user_user_bot_dot.classList.add(
    "svgHide",
    "svgTower",
    "tower_user_user_bot_dot"
  );
  const tower_bot = document.createElementNS(SVG_NS, "g");
  tower_bot.classList.add("svgHide", "svgTower", "tower_bot");
  const tower_bot_dot = document.createElementNS(SVG_NS, "g");
  tower_bot_dot.classList.add("svgHide", "svgTower", "tower_bot_dot");
  const tower_bot_user = document.createElementNS(SVG_NS, "g");
  tower_bot_user.classList.add("svgHide", "svgTower", "tower_bot_user");
  const tower_bot_user_dot = document.createElementNS(SVG_NS, "g");
  tower_bot_user_dot.classList.add("svgHide", "svgTower", "tower_bot_user_dot");
  const tower_bot_user_bot = document.createElementNS(SVG_NS, "g");
  tower_bot_user_bot.classList.add("svgHide", "svgTower", "tower_bot_user_bot");
  const tower_bot_user_bot_dot = document.createElementNS(SVG_NS, "g");
  tower_bot_user_bot_dot.classList.add(
    "svgHide",
    "svgTower",
    "tower_bot_user_bot_dot"
  );
  const tower_bot_bot_user = document.createElementNS(SVG_NS, "g");
  tower_bot_bot_user.classList.add("svgHide", "svgTower", "tower_bot_bot_user");
  const tower_bot_bot_user_dot = document.createElementNS(SVG_NS, "g");
  tower_bot_bot_user_dot.classList.add(
    "svgHide",
    "svgTower",
    "tower_bot_bot_user_dot"
  );

  tower_user.appendChild(createSvgCircle(50, 50, 35, classFillColorUser));
  tower_user_dot.appendChild(createSvgCircle(50, 50, 35, classFillColorUser));
  tower_user_dot.appendChild(createSvgCircle(50, 50, 10, classFillColorDot));
  tower_user_bot.appendChild(createSvgCircle(45, 55, 35, classFillColorUser));
  tower_user_bot.appendChild(createSvgCircle(55, 45, 35, classFillColorBot));
  tower_user_bot_dot.appendChild(
    createSvgCircle(45, 55, 35, classFillColorUser)
  );
  tower_user_bot_dot.appendChild(
    createSvgCircle(55, 45, 35, classFillColorBot)
  );
  tower_user_bot_dot.appendChild(
    createSvgCircle(55, 45, 10, classFillColorDot)
  );
  tower_user_bot_user.appendChild(
    createSvgCircle(40, 60, 35, classFillColorUser)
  );
  tower_user_bot_user.appendChild(
    createSvgCircle(50, 50, 35, classFillColorBot)
  );
  tower_user_bot_user.appendChild(
    createSvgCircle(60, 40, 35, classFillColorUser)
  );
  tower_user_bot_user_dot.appendChild(
    createSvgCircle(40, 60, 35, classFillColorUser)
  );
  tower_user_bot_user_dot.appendChild(
    createSvgCircle(50, 50, 35, classFillColorBot)
  );
  tower_user_bot_user_dot.appendChild(
    createSvgCircle(60, 40, 35, classFillColorUser)
  );
  tower_user_bot_user_dot.appendChild(
    createSvgCircle(60, 40, 10, classFillColorDot)
  );
  tower_user_user_bot.appendChild(
    createSvgCircle(40, 60, 35, classFillColorUser)
  );
  tower_user_user_bot.appendChild(
    createSvgCircle(50, 50, 35, classFillColorUser, classStrokeColor)
  );
  tower_user_user_bot.appendChild(
    createSvgCircle(60, 40, 35, classFillColorBot)
  );
  tower_user_user_bot_dot.appendChild(
    createSvgCircle(40, 60, 35, classFillColorUser)
  );
  tower_user_user_bot_dot.appendChild(
    createSvgCircle(50, 50, 35, classFillColorUser, classStrokeColor)
  );
  tower_user_user_bot_dot.appendChild(
    createSvgCircle(60, 40, 35, classFillColorBot)
  );
  tower_user_user_bot_dot.appendChild(
    createSvgCircle(60, 40, 10, classFillColorDot)
  );
  tower_bot.appendChild(createSvgCircle(50, 50, 35, classFillColorBot));
  tower_bot_dot.appendChild(createSvgCircle(50, 50, 35, classFillColorBot));
  tower_bot_dot.appendChild(createSvgCircle(50, 50, 10, classFillColorDot));
  tower_bot_user.appendChild(createSvgCircle(45, 55, 35, classFillColorBot));
  tower_bot_user.appendChild(createSvgCircle(55, 45, 35, classFillColorUser));
  tower_bot_user_dot.appendChild(
    createSvgCircle(45, 55, 35, classFillColorBot)
  );
  tower_bot_user_dot.appendChild(
    createSvgCircle(55, 45, 35, classFillColorUser)
  );
  tower_bot_user_dot.appendChild(
    createSvgCircle(55, 45, 10, classFillColorDot)
  );
  tower_bot_user_bot.appendChild(
    createSvgCircle(40, 60, 35, classFillColorBot)
  );
  tower_bot_user_bot.appendChild(
    createSvgCircle(50, 50, 35, classFillColorUser)
  );
  tower_bot_user_bot.appendChild(
    createSvgCircle(60, 40, 35, classFillColorBot)
  );
  tower_bot_user_bot_dot.appendChild(
    createSvgCircle(40, 60, 35, classFillColorBot)
  );
  tower_bot_user_bot_dot.appendChild(
    createSvgCircle(50, 50, 35, classFillColorUser)
  );
  tower_bot_user_bot_dot.appendChild(
    createSvgCircle(60, 40, 35, classFillColorBot)
  );
  tower_bot_user_bot_dot.appendChild(
    createSvgCircle(60, 40, 10, classFillColorDot)
  );
  tower_bot_bot_user.appendChild(
    createSvgCircle(40, 60, 35, classFillColorBot)
  );
  tower_bot_bot_user.appendChild(
    createSvgCircle(50, 50, 35, classFillColorBot, classStrokeColor)
  );
  tower_bot_bot_user.appendChild(
    createSvgCircle(60, 40, 35, classFillColorUser)
  );
  tower_bot_bot_user_dot.appendChild(
    createSvgCircle(40, 60, 35, classFillColorBot)
  );
  tower_bot_bot_user_dot.appendChild(
    createSvgCircle(50, 50, 35, classFillColorBot, classStrokeColor)
  );
  tower_bot_bot_user_dot.appendChild(
    createSvgCircle(60, 40, 35, classFillColorUser)
  );
  tower_bot_bot_user_dot.appendChild(
    createSvgCircle(60, 40, 10, classFillColorDot)
  );
  svgTowerVector.appendChild(tower_user);
  svgTowerVector.appendChild(tower_user_dot);
  svgTowerVector.appendChild(tower_user_bot);
  svgTowerVector.appendChild(tower_user_bot_dot);
  svgTowerVector.appendChild(tower_user_bot_user);
  svgTowerVector.appendChild(tower_user_bot_user_dot);
  svgTowerVector.appendChild(tower_user_user_bot);
  svgTowerVector.appendChild(tower_user_user_bot_dot);
  svgTowerVector.appendChild(tower_bot);
  svgTowerVector.appendChild(tower_bot_dot);
  svgTowerVector.appendChild(tower_bot_user);
  svgTowerVector.appendChild(tower_bot_user_dot);
  svgTowerVector.appendChild(tower_bot_user_bot);
  svgTowerVector.appendChild(tower_bot_user_bot_dot);
  svgTowerVector.appendChild(tower_bot_bot_user);
  svgTowerVector.appendChild(tower_bot_bot_user_dot);
  return svgTowerVector;
}

/**
 * An svg icon image is loaded, returned and appended to the container element.
 * @param {HTMLDivElement} divElem - The DOM parent element where the loaded svg image will be appended to.
 *
 * @returns {Promise<SVGSVGElement>} - The DOM element for the loaded svg image file
 */
async function loadIcon(divElem, path) {
  // try {
  //   if (!divElem instanceof HTMLDivElement) {
  //     throw new Error("invalid parameter");
  //   }
  //   const response = await fetch(path);
  //   if (!response.ok) {
  //     throw new Error(`HTTP error! Status: ${response.status}`);
  //   }
  //   const text = await response.text();
  //   const parser = new DOMParser();
  //   const svgDoc = parser.parseFromString(text, "image/svg+xml");
  //   const errornode = svgDoc.querySelector("parsererror");
  //   if (errornode) {
  //     throw new Error(`Error parsing SVG: ${errornode.textContent}`);
  //   }
  //   const svgElement = svgDoc.querySelector("svg");
  //   if (!svgElement instanceof SVGSVGElement) {
  //     throw new Error("Invalid SVG element");
  //   }
  //   divElem.appendChild(svgElement);
  //   return svgElement;
  // } catch (error) {
  //   console.error(error);
  //   return null;
  // }
}

export { createSvgTowerVector };
