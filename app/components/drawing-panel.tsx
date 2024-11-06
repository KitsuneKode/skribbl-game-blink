'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Undo2,
  Redo2,
  Eraser,
  PenTool,
  Trash2,
  Download,
  Check,
  Copy,
  Clock,
} from 'lucide-react';

const colors = ['#000000', '#FF0000', '#0000FF', '#008000', '#FFFF00'];

export default function CanvasPanel({
  word,
  gameNumber,
}: {
  word: string;
  gameNumber: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [eraserSize, setEraserSize] = useState(20);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [timer, setTimer] = useState(120); // 2 minutes in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const context = canvas.getContext('2d');
    if (context) {
      context.scale(2, 2);
      context.lineCap = 'round';
      context.strokeStyle = color;
      contextRef.current = context;
      context.lineWidth = brushSize;
    }

    // Load saved drawing
    const savedDrawing = localStorage.getItem('canvasDrawing');
    if (savedDrawing) {
      const img = new Image();
      img.onload = () => {
        const context = canvasRef.current?.getContext('2d');
        context?.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          0,
          0,
          window.innerWidth,
          window.innerHeight
        );
      };
      img.src = savedDrawing;
    }

    // Load saved timer
    const savedTimer = localStorage.getItem('canvasTimer');
    if (savedTimer) {
      setTimer(parseInt(savedTimer, 10));
    }

    return () => {
      // Cleanup
      // unsubscribe();
      //   await gameUtils.subscribeToSession(gameNumber, (sessionData) => {
      //     if (sessionData.timer !== timer) {
      //       setTimer(sessionData.timer);
      //     }
      //     if (sessionData.imageUrl) {
      //       const img = new Image();
      //       img.onload = () => {
      //         contextRef.current?.drawImage(img, 0, 0);
      //       };
      //       img.src = sessionData.imageUrl;
      //     }
      //   });
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(async () => {
        setTimer((prevTimer) => {
          const newTimer = prevTimer - 1;
          localStorage.setItem('canvasTimer', newTimer.toString());
          return newTimer;
        });
      }, 1000);
    } else if (timer === 0) {
      setIsTimerRunning(false);
      saveToFirebase();
      localStorage.removeItem('canvasTimer');
      localStorage.removeItem('canvasDrawing');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timer]);

  const startDrawing = ({
    nativeEvent,
  }:
    | React.MouseEvent<HTMLCanvasElement>
    | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isTimerRunning) return;
    const offsetX =
      nativeEvent instanceof MouseEvent
        ? nativeEvent.offsetX
        : nativeEvent.touches[0].clientX -
          canvasRef.current!.getBoundingClientRect().left;
    const offsetY =
      nativeEvent instanceof MouseEvent
        ? nativeEvent.offsetY
        : nativeEvent.touches[0].clientY -
          canvasRef.current!.getBoundingClientRect().top;
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    setIsDrawing(true);

    saveToLocalStorage();

    // Save current state for undo
    const imageData = contextRef.current?.getImageData(
      0,
      0,
      canvasRef.current!.width,
      canvasRef.current!.height
    );
    if (imageData) {
      setUndoStack((prev) => [...prev.slice(-9), imageData]);
      setRedoStack([]);
    }
  };

  const finishDrawing = () => {
    if (!isTimerRunning) return;
    contextRef.current?.closePath();
    setIsDrawing(false);
  };

  const draw = ({
    nativeEvent,
  }:
    | React.MouseEvent<HTMLCanvasElement>
    | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isTimerRunning) return;

    const offsetX =
      nativeEvent instanceof MouseEvent
        ? nativeEvent.offsetX
        : nativeEvent.touches[0].clientX -
          canvasRef.current!.getBoundingClientRect().left;
    const offsetY =
      nativeEvent instanceof MouseEvent
        ? nativeEvent.offsetY
        : nativeEvent.touches[0].clientY -
          canvasRef.current!.getBoundingClientRect().top;

    if (tool === 'eraser') {
      contextRef.current!.save();
      contextRef.current!.beginPath();
      contextRef.current!.arc(offsetX, offsetY, eraserSize / 2, 0, Math.PI * 2);
      contextRef.current!.clip();
      contextRef.current!.clearRect(
        offsetX - eraserSize / 2,
        offsetY - eraserSize / 2,
        eraserSize,
        eraserSize
      );
      contextRef.current!.restore();
    } else {
      contextRef.current!.lineTo(offsetX, offsetY);
      contextRef.current!.stroke();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (context && canvas) {
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const undo = () => {
    if (undoStack.length > 0) {
      const lastState = undoStack[undoStack.length - 1];
      if (lastState && contextRef.current) {
        setRedoStack((prev) => [
          ...prev,
          contextRef.current!.getImageData(
            0,
            0,
            canvasRef.current!.width,
            canvasRef.current!.height
          ),
        ]);
        setUndoStack((prev) => prev.slice(0, -1));
        contextRef.current.putImageData(lastState, 0, 0);
      }
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      if (nextState && contextRef.current) {
        setUndoStack((prev) => [
          ...prev,
          contextRef.current!.getImageData(
            0,
            0,
            canvasRef.current!.width,
            canvasRef.current!.height
          ),
        ]);
        setRedoStack((prev) => prev.slice(0, -1));
        contextRef.current.putImageData(nextState, 0, 0);
      }
    }
  };

  const saveToLocalStorage = () => {
    localStorage.setItem('canvasDrawing', canvasRef.current?.toDataURL() || '');
  };

  const saveAsImage = () => {
    try {
      if (!canvasRef.current) return;

      // Get the original canvas dimensions
      const originalWidth = canvasRef.current.width;
      const originalHeight = canvasRef.current.height;

      // Calculate the scaling factor to fit within 512x512
      const scaleFactor = Math.min(512 / originalWidth, 512 / originalHeight);

      // Create a new canvas with 512x512 dimensions
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 512;
      tempCanvas.height = 512;
      const tempCtx = tempCanvas.getContext('2d');

      if (tempCtx) {
        // Fill the tempCanvas with a white background
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw the scaled original canvas onto the tempCanvas
        tempCtx.save();
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.scale(scaleFactor, scaleFactor);
        tempCtx.translate(-originalWidth / 2, -originalHeight / 2);
        tempCtx.drawImage(canvasRef.current, 0, 0);
        tempCtx.restore();
      }

      // Convert the tempCanvas to a data URL
      const dataUrl = tempCanvas.toDataURL('image/png');

      // Create a download link
      const link = document.createElement('a');
      link.download = 'canvas-drawing.png';
      link.href = dataUrl;
      link.click();

      // setTimer(0);
    } catch (error) {
      console.error('Error saving image:', error);
    }
  };

  const saveToFirebase = async () => {
    try {
      // setIsTimerRunning(false);
      // Create a new canvas with a white background
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 512;
      tempCanvas.height = 512;
      const tempCtx = tempCanvas.getContext('2d');

      if (tempCtx && canvasRef.current) {
        // Draw the original canvas onto the tempCanvas, scaling it to fit
        const originalWidth = canvasRef.current.width;
        const originalHeight = canvasRef.current.height;
        const scaleFactor = Math.min(512 / originalWidth, 512 / originalHeight);

        tempCtx.save();
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.scale(scaleFactor, scaleFactor);
        tempCtx.translate(-originalWidth / 2, -originalHeight / 2);
        tempCtx.drawImage(canvasRef.current, 0, 0);
        tempCtx.restore();
      }

      // Convert the tempCanvas to a Blob
      const imageBlob = await new Promise((resolve) => {
        tempCanvas.toBlob(resolve, 'image/png');
      });

      // Send the Blob and gameNumber to the API endpoint
      const formData = new FormData();
      formData.append('gameNumber', String(gameNumber));
      formData.append('image', imageBlob as Blob);

      const response = await fetch('/api/game/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const { imageUrl } = await response.json();
        console.log('imageURL:', imageUrl);
        setImageUrl(imageUrl);
        setTimer(0);
      } else {
        throw new Error('Failed to upload image');
      }
    } catch (error) {
      console.error('Error saving image:', error);
    }
  };

  const handleToolChange = (value: string | undefined) => {
    if (value === 'pen' || value === 'eraser') {
      setTool(value);
      if (contextRef.current) {
        contextRef.current.strokeStyle = value === 'eraser' ? '#FFFFFF' : color;
        contextRef.current.lineWidth =
          value === 'eraser' ? eraserSize : brushSize;
      }
    }
  };

  const copyDownloadUrl = () => {
    navigator.clipboard.writeText(imageUrl).then(() => {
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2000);
    });
  };

  const startClock = () => {
    setIsTimerRunning(true);
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row p-4 bg-gray-50 relative">
      {/* Canvas */}
      <div className=" flex-grow flex flex-col bg-white rounded-lg shadow-md overflow-hidden mb-4 md:mb-0 md:mr-4 min-h-full ">
        <div className="flex justify-between items-center p-4 bg-gray-100 border-b border-gray-200">
          <div className="flex space-x-2">
            <ToggleGroup
              type="single"
              value={tool}
              onValueChange={handleToolChange}
            >
              <ToggleGroupItem
                value="pen"
                aria-label="Pen tool"
                disabled={!isTimerRunning}
              >
                <PenTool className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="eraser"
                aria-label="Eraser tool"
                disabled={!isTimerRunning}
              >
                <Eraser className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Slider
              className="w-32"
              value={[tool === 'pen' ? brushSize : eraserSize]}
              onValueChange={(value) =>
                tool === 'pen'
                  ? setBrushSize(value[0])
                  : setEraserSize(value[0])
              }
              min={1}
              max={50}
              step={1}
              disabled={!isTimerRunning}
            />
            {tool === 'pen' && (
              <div className="flex space-x-1">
                {colors.map((c) => (
                  <button
                    key={c}
                    className={`w-6 h-6 rounded-full ${
                      color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      setColor(c);
                      if (contextRef.current) {
                        contextRef.current.strokeStyle = c;
                      }
                    }}
                    disabled={!isTimerRunning}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    if (contextRef.current) {
                      contextRef.current.strokeStyle = e.target.value;
                    }
                  }}
                  className="w-6 h-6"
                  disabled={!isTimerRunning}
                />
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={undo}
              disabled={undoStack.length === 0 || !isTimerRunning}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={redo}
              disabled={redoStack.length === 0 || !isTimerRunning}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={clearCanvas}
              disabled={!isTimerRunning}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={saveAsImage}
              disabled={!isTimerRunning}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={finishDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={finishDrawing}
          onTouchMove={draw}
          className={`flex-grow cursor-crosshair ${
            !isTimerRunning && 'pointer-events-none'
          }`}
        />
      </div>
      {/* Canvas */}

      <div className="w-full md:w-80 p-6 bg-gray-200 rounded-lg shadow-md flex flex-col space-y-6 border border-gray-300">
        <div className="text-3xl font-bold text-primary text-center mb-4 rounded-md">
          {word}
        </div>
        <div className="flex-grow space-y-6">
          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="text-lg font-semibold mb-2">Steps:</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>Click Start Clock to begin</li>
              <li>You got 2 minutes to complete your diagram</li>
              <li>
                If you complete the diagram before time, click on complete to
                upload
              </li>
            </ol>
          </div>
        </div>
        <div className="space-y-4">
          <Button
            className="w-full text-xl py-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg"
            onClick={startClock}
            disabled={isTimerRunning || timer === 0}
          >
            <Clock className="mr-2 h-6 w-6" />
            {isTimerRunning ? 'Clock Started' : 'Start Clock'}
          </Button>
          <div className="flex items-center space-x-2">
            <Button
              onClick={copyDownloadUrl}
              className="flex-grow bg-white text-gray-800 hover:bg-gray-100 overflow-hidden"
            >
              Image URL Download : {imageUrl}
            </Button>
            <Button onClick={copyDownloadUrl} size="icon" variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {showCopiedMessage && (
            <div className="text-center text-green-500 text-sm">Copied!</div>
          )}
          <Button
            className="w-full bg-green-500 hover:bg-green-600"
            onClick={saveToFirebase}
            disabled={!isTimerRunning}
          >
            <Check className="mr-2 h-4 w-4" /> Complete
          </Button>
        </div>
      </div>
      <div className="absolute top-1 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-4xl font-bold rounded-lg w-40 h-20 flex items-center justify-center shadow-lg border-4 border-white">
        <div className="text-center">
          <div className="text-5xl">
            {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>
    </div>
  );
}
