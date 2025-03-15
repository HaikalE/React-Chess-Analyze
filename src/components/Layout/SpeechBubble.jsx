import React, { useRef, useEffect } from 'react';

class SpeechBubbleRenderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.text = "";
    this.targetPos = { x: 0, y: 0 };
    this.panelBounds = new SpeechBubbleRenderer.Bounds(0, 0, 100, 50);
    this.fontSize = 12;
    this.font = "Arial";
    this.fontColor = "#000";
    this.padding = 5;
    this.cornerRadius = 5;
    this.panelFillColor = "rgba(255, 255, 255, 0.9)";
    this.panelBorderColor = "#000";
    this.panelBorderWidth = 1;
    this.tailLength = 10;
    this.tailWidth = 10;
    this.tailStyle = SpeechBubbleRenderer.TAIL_CURVED;
  }

  setTargetPos(x, y) {
    this.targetPos = { x, y };
  }

  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    
    // Save context state
    ctx.save();
    
    // Draw panel background
    ctx.fillStyle = this.panelFillColor;
    ctx.strokeStyle = this.panelBorderColor;
    ctx.lineWidth = this.panelBorderWidth;
    
    const { x, y, width, height } = this.panelBounds;
    
    // Draw rounded rectangle for panel
    ctx.beginPath();
    ctx.moveTo(x + this.cornerRadius, y);
    ctx.lineTo(x + width - this.cornerRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + this.cornerRadius);
    ctx.lineTo(x + width, y + height - this.cornerRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - this.cornerRadius, y + height);
    ctx.lineTo(x + this.cornerRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - this.cornerRadius);
    ctx.lineTo(x, y + this.cornerRadius);
    ctx.quadraticCurveTo(x, y, x + this.cornerRadius, y);
    ctx.closePath();
    
    ctx.fill();
    ctx.stroke();
    
    // Draw tail
    this.drawTail();
    
    // Draw text
    ctx.fillStyle = this.fontColor;
    ctx.font = `${this.fontSize}px ${this.font}`;
    ctx.textBaseline = "top";
    
    const textX = x + this.padding;
    const textY = y + this.padding;
    
    ctx.fillText(this.text, textX, textY);
    
    // Restore context state
    ctx.restore();
  }
  
  drawTail() {
    const ctx = this.ctx;
    const { x, y, width, height } = this.panelBounds;
    
    // Calculate tail position
    const tailBaseX = this.targetPos.x > x + width / 2 ? x : x + width;
    const tailBaseY = y + height / 2;
    
    ctx.beginPath();
    
    if (this.tailStyle === SpeechBubbleRenderer.TAIL_STRAIGHT) {
      // Straight tail
      ctx.moveTo(tailBaseX, tailBaseY - this.tailWidth / 2);
      ctx.lineTo(this.targetPos.x, this.targetPos.y);
      ctx.lineTo(tailBaseX, tailBaseY + this.tailWidth / 2);
    } else {
      // Curved tail
      const controlX = (tailBaseX + this.targetPos.x) / 2;
      const controlY1 = tailBaseY - this.tailWidth;
      const controlY2 = tailBaseY + this.tailWidth;
      
      ctx.moveTo(tailBaseX, tailBaseY - this.tailWidth / 2);
      ctx.quadraticCurveTo(controlX, controlY1, this.targetPos.x, this.targetPos.y);
      ctx.quadraticCurveTo(controlX, controlY2, tailBaseX, tailBaseY + this.tailWidth / 2);
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// Static properties
SpeechBubbleRenderer.TAIL_CURVED = 0;
SpeechBubbleRenderer.TAIL_STRAIGHT = 1;

SpeechBubbleRenderer.Bounds = class {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
};

const SpeechBubble = ({ 
  text, 
  targetX, 
  targetY, 
  width = 100, 
  height = 50,
  style = {}
}) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create and draw speech bubble
    const bubble = new SpeechBubbleRenderer(ctx);
    bubble.text = text;
    bubble.setTargetPos(targetX, targetY);
    bubble.panelBounds = new SpeechBubbleRenderer.Bounds(10, 10, width, height);
    
    // Apply custom styles
    if (style.fontSize) bubble.fontSize = style.fontSize;
    if (style.font) bubble.font = style.font;
    if (style.fontColor) bubble.fontColor = style.fontColor;
    if (style.padding) bubble.padding = style.padding;
    if (style.cornerRadius) bubble.cornerRadius = style.cornerRadius;
    if (style.backgroundColor) bubble.panelFillColor = style.backgroundColor;
    if (style.borderColor) bubble.panelBorderColor = style.borderColor;
    if (style.borderWidth) bubble.panelBorderWidth = style.borderWidth;
    if (style.tailStyle === 'straight') bubble.tailStyle = SpeechBubbleRenderer.TAIL_STRAIGHT;
    
    bubble.draw();
  }, [text, targetX, targetY, width, height, style]);
  
  return (
    <canvas
      ref={canvasRef}
      width={width + 50}  // Extra space for tail
      height={height + 50}
      style={{ position: 'absolute', pointerEvents: 'none' }}
    />
  );
};

export default SpeechBubble;