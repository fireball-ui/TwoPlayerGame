/**
 * @module types
 * @copyright 2025-06-29 Magnus Dümke
 * @license MIT
 * @author Magnus Dümke
 * @version 1.0.0
 * @since 2025-06-29
 * @description This module defines types used in the TowerHunt game, including the Vault type.
 */

/**
 * Represents a Player vault with stones currently conquered (see GameLogic).
 * @typedef {object} PlayerVault
 * @property {number} self - The number of stones associated with this player.
 * @property {number} opponent - The number of stones associated with the opponent.
 */

/**
 * @typedef {GridCell[][]} MoveSpace
 * @description Represents the topology of possible moves for a player, where each element describes the move as
 *  a pair of GridCell instances.
 */

const NEW_VAULT = Object.freeze({
  self: 0,
  opponent: 0,
});

export { NEW_VAULT };
