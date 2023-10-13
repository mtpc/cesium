import BoundingRectangle from "../Core/BoundingRectangle.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import ViewportQuadVS from "../Shaders/ViewportQuadVS.js";
import ClearCommand from "./ClearCommand.js";
import DrawCommand from "./DrawCommand.js";
import Framebuffer from "./Framebuffer.js";
import RenderState from "./RenderState.js";
import ShaderProgram from "./ShaderProgram.js";
import { TransformFeedbackCommand } from './TransformFeedbackCommand.js'

/**
 * @private
 */
function ComputeEngine(context) {
  this._context = context;
}

let renderStateScratch;
const drawCommandScratch = new DrawCommand({
  primitiveType: PrimitiveType.TRIANGLES,
});
const clearCommandScratch = new ClearCommand({
  color: new Color(0.0, 0.0, 0.0, 0.0),
});

function createFramebuffer(context, outputTexture) {
  return new Framebuffer({
    context: context,
    colorTextures: [outputTexture],
    destroyAttachments: false,
  });
}

function createViewportQuadShader(context, fragmentShaderSource) {
  return ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: ViewportQuadVS,
    fragmentShaderSource: fragmentShaderSource,
    attributeLocations: {
      position: 0,
      textureCoordinates: 1,
    },
  });
}

function createRenderState(width, height) {
  if (
    !defined(renderStateScratch) ||
    renderStateScratch.viewport.width !== width ||
    renderStateScratch.viewport.height !== height
  ) {
    renderStateScratch = RenderState.fromCache({
      viewport: new BoundingRectangle(0, 0, width, height),
    });
  }
  return renderStateScratch;
}

ComputeEngine.prototype.execute = function (computeCommand) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("computeCommand", computeCommand);
  //>>includeEnd('debug');
  const isTf = computeCommand instanceof TransformFeedbackCommand

  // This may modify the command's resources, so do error checking afterwards
  if (defined(computeCommand.preExecute)) {
    computeCommand.preExecute(computeCommand);
  }

  //>>includeStart('debug', pragmas.debug);
  if (
    !defined(computeCommand.fragmentShaderSource) &&
    !defined(computeCommand.shaderProgram)
  ) {
    throw new DeveloperError(
      "computeCommand.fragmentShaderSource or computeCommand.shaderProgram is required."
    );
  }
  if (!isTf) Check.defined("computeCommand.outputTexture", computeCommand.outputTexture);
  //>>includeEnd('debug');
  let output, renderState, framebuffer

  const context = this._context;
  const vertexArray = defined(computeCommand.vertexArray)
    ? computeCommand.vertexArray
    : context.getViewportQuadVertexArray();
  const shaderProgram = defined(computeCommand.shaderProgram)
    ? computeCommand.shaderProgram
    : createViewportQuadShader(context, computeCommand.fragmentShaderSource);
  if (isTf) {
    output = computeCommand.transformFeedbackBuffers
    shaderProgram._transformFeedbackVaryings = Array.from(output.keys())
    const height = context._canvas.height;
    const width = context._canvas.width;
    renderState = createRenderState(width, height);
  } else {
    output = computeCommand.outputTexture;
    framebuffer = createFramebuffer(context, output);
    const height = output.height;
    const width = output.width;
    renderState = createRenderState(width, height);
    const clearCommand = clearCommandScratch;
    clearCommand.framebuffer = framebuffer;
    clearCommand.renderState = renderState;
    clearCommand.execute(context);
  }
  const uniformMap = computeCommand.uniformMap;
  const drawCommand = drawCommandScratch;
  drawCommand.vertexArray = vertexArray;
  drawCommand.renderState = renderState;
  drawCommand.shaderProgram = shaderProgram;
  drawCommand.uniformMap = uniformMap;
  if (isTf) {
    if(defined(computeCommand.primitiveType)){
      drawCommand.primitiveType = computeCommand.primitiveType
    }
    drawCommand.transformFeedbackBuffers = output
  } else {
    drawCommand.framebuffer = framebuffer;
  }
  drawCommand.execute(context);

  if (!isTf) framebuffer.destroy();

  if (!computeCommand.persists) {
    shaderProgram.destroy();
    if (defined(computeCommand.vertexArray)) {
      vertexArray.destroy();
    }
  }

  if (defined(computeCommand.postExecute)) {
    computeCommand.postExecute(output);
  }
};

ComputeEngine.prototype.isDestroyed = function () {
  return false;
};

ComputeEngine.prototype.destroy = function () {
  return destroyObject(this);
};
export default ComputeEngine;
