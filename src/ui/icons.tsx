import React from 'react';
import {
  Sparkles,
  Plus,
  Type,
  Image as LucideImage,
  Shapes,
  User,
  AtSign,
  Palette,
  Wand2,
  Layers,
  Undo2,
  Redo2,
  ChevronLeft,
  X,
  Check,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Download,
  Share2,
  Folder,
  LayoutGrid,
  ArrowLeftRight,
  Crop,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Droplet,
  MousePointerClick,
} from 'lucide-react';

/**
 * Clean Lucide React Icon System.
 * Standardized on official Lucide vector paths for modern aesthetic design.
 */

type IconProps = {
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
};

export const IcSparkle = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Sparkles size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcPlus = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Plus size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcType = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Type size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcImage = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <LucideImage size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcShapes = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Shapes size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcAvatar = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <User size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcAt = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <AtSign size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcPalette = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Palette size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcWand = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Wand2 size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcLayers = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Layers size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcUndo = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Undo2 size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcRedo = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Redo2 size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcBack = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <ChevronLeft size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcClose = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <X size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcCheck = ({ size = 20, className, color, strokeWidth = 2.5 }: IconProps) => (
  <Check size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcTrash = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Trash2 size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcCopy = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Copy size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcUp = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <ArrowUp size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcDown = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <ArrowDown size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcEye = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Eye size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcEyeOff = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <EyeOff size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcZoomIn = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <ZoomIn size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcZoomOut = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <ZoomOut size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcFit = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Maximize2 size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcReset = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <RotateCcw size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcDownload = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Download size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcShare = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Share2 size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcFolder = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Folder size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcGrid = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <LayoutGrid size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcSwap = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <ArrowLeftRight size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcCrop = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Crop size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcBold = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Bold size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcAlignLeft = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <AlignLeft size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcAlignCenter = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <AlignCenter size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcAlignRight = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <AlignRight size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcSize = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Type size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcDroplet = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <Droplet size={size} className={className} color={color} strokeWidth={strokeWidth} />
);

export const IcTap = ({ size = 20, className, color, strokeWidth = 2 }: IconProps) => (
  <MousePointerClick size={size} className={className} color={color} strokeWidth={strokeWidth} />
);
