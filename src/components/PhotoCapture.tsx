/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RotateCcw, Check, Trash2, CameraOff } from 'lucide-react';

interface PhotoCaptureProps {
  value?: string; // Base64 or image URL
  onChange: (base64Image: string) => void;
  onClear: () => void;
  label?: string;
}

export default function PhotoCapture({ value, onChange, onClear, label = "Photo / Prise de vue" }: PhotoCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load user cameras list
  useEffect(() => {
    if (isCapturing) {
      navigator.mediaDevices.enumerateDevices()
        .then(allDevices => {
          const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
          setDevices(videoDevices);
          if (videoDevices.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoDevices[0].deviceId);
          }
        })
        .catch(err => {
          console.error("Enumerate devices error:", err);
        });
    }
  }, [isCapturing]);

  // Start live feed
  useEffect(() => {
    if (!isCapturing) return;

    let active = true;

    const startCamera = async () => {
      setCameraError(null);
      // Clean up previous stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: selectedDeviceId 
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
            : { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Video play error:", e));
        }
      } catch (err: any) {
        console.error("Webcam access error:", err);
        if (active) {
          setCameraError(
            "Impossible d'accéder à la caméra. Veuillez autoriser l'accès ou importer un fichier directement."
          );
        }
      }
    };

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isCapturing, selectedDeviceId]);

  const handleCapture = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Optional mirror if front-facing (facingMode user)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          onChange(dataUrl);
          stopCamera();
        } catch (err) {
          console.error("Canvas export failed:", err);
        }
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
    setCameraError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onChange(event.target.result as string);
      }
    };
    reader.onerror = (err) => {
      console.error("File reading error:", err);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <label className="block text-gray-400 text-xs font-mono uppercase tracking-wide">
        {label}
      </label>

      {/* Hidden file selector */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* 1. Preview of the stored image */}
      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-[#2b3a57] bg-[#10141f] h-48 flex items-center justify-center">
          <img 
            src={value} 
            alt="Prise de vue article" 
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-[#000000]/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-200">
            <button
              type="button"
              onClick={triggerFileInput}
              className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-medium hover:bg-gray-700 flex items-center gap-1 border border-gray-700"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Remplacer</span>
            </button>
            <button
              type="button"
              onClick={onClear}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Supprimer</span>
            </button>
          </div>
        </div>
      ) : isCapturing ? (
        /* 2. LIVE VIDEO CAPTURE ELEMENT */
        <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-[#bda165]/50 bg-black flex flex-col items-center justify-between p-2 h-72">
          {cameraError ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <CameraOff className="h-10 w-10 text-red-500 mb-2" />
              <p className="text-xs text-red-400 font-semibold max-w-xs">{cameraError}</p>
            </div>
          ) : (
            <div className="relative w-full h-48 bg-[#0a0d14] rounded-lg overflow-hidden flex items-center justify-center">
              <video 
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-contain"
              />
              <span className="absolute top-2 left-2 bg-emerald-500/85 text-black px-2 py-0.5 rounded text-[9px] font-mono font-bold animate-pulse">
                • LIVE CAM
              </span>
            </div>
          )}

          {/* Controls toolbar */}
          <div className="w-full flex justify-between items-center px-2 py-1 bg-gray-950 border border-gray-800 rounded-lg">
            {/* Device switcher selection if multiple cameras present */}
            {devices.length > 1 && !cameraError ? (
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="text-[10px] bg-gray-900 text-gray-300 border border-gray-800 rounded px-1.5 py-0.5 max-w-[120px]"
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    Caméra {i + 1}
                  </option>
                ))}
              </select>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-1.5 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-bold"
              >
                Annuler
              </button>
              
              {!cameraError && (
                <button
                  type="button"
                  onClick={handleCapture}
                  className="px-4 py-1.5 bg-[#bda165] hover:bg-[#cca96e] text-black font-extrabold font-mono text-[10px] rounded-lg flex items-center gap-1 shadow-md shadow-[#bda165]/10 animate-bounce"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>PRENDRE LA PHOTO</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 3. COOLDOWN DISPLAY (NO PICTURE DEFINED YET) */
        <div className="rounded-xl border-2 border-dashed border-[#2b3a57] bg-[#111624] p-5 text-center flex flex-col items-center justify-center h-48 group">
          <div className="h-10 w-10 bg-[#162135] text-[#bda165] border border-[#2b3a57] rounded-full flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110">
            <Camera className="h-5 w-5" />
          </div>
          
          <p className="text-xs text-gray-300 font-semibold mb-3">Aucune prise de vue enregistrée</p>
          
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={() => setIsCapturing(true)}
              className="px-3 py-1.5 bg-[#1a2538] hover:bg-[#25344f] text-yellow-500 border border-[#273955] rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Lancer Appareil Photo</span>
            </button>
            
            <button
              type="button"
              onClick={triggerFileInput}
              className="px-3 py-1.5 bg-[#0f1d18] hover:bg-[#152e25] text-emerald-400 border border-emerald-500/10 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Parcourir / Fichier</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
