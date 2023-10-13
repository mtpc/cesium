import WebGLConstants from '../Core/WebGLConstants.js'
import Pass from './Pass.js'
import ComputeCommand from './ComputeCommand.js'

/**
 *
 * @param {VertexArray} options.vertexArray
 * @param {ShaderProgram} options.shaderProgram
 * @param {Map<string, ArrayBufferView>} options.transformFeedbackBuffers
 * @param {Object} options.uniformMap
 * @param {number} options.primitiveType
 * @param {(bufs: ArrayBuffer[]) => void } options.postExecute
 * @param {number} options.pass
 * @param {boolean} options.persists
 * @constructor
 */
export function TransformFeedbackCommand(options) {
  this.primitiveType = WebGLConstants.POINTS
  this.pass = Pass.COMPUTE
  this.persists = true
  Object.assign(this, options)
}

Object.setPrototypeOf(TransformFeedbackCommand.prototype, ComputeCommand.prototype)
