import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Bookmark, Check, Pencil } from 'lucide-react';
import { isDuplicate, saveBadge, writeClipboard } from '../lib/storage';
import BadgeDetailView from './BadgeDetailView';

interface GalleryBadgeDetailProps {
  categorySlug: string;
  categoryName: string;
  label: string;
  message: string;
  color: string;
  logo?: string;
  logoColor?: string;
  logoSize?: string;
  style?: 'flat' | 'flat-square' | 'plastic' | 'for-the-badge' | 'social';
  labelColor?: string;
}

export default function GalleryBadgeDetail({
  categorySlug,
  categoryName,
  label,
  message,
  color,
  logo,
  logoColor,
  logoSize,
  style = 'flat',
  labelColor,
}: GalleryBadgeDetailProps) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const [saved, setSaved] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Check if already saved
  useEffect(() => {
    let active = true;
    async function checkSaved() {
      try {
        const isDup = await isDuplicate({
          label,
          message,
          color,
          logo: logo || '',
          logoColor: logoColor || '',
          logoSize: logoSize || '',
          style,
          labelColor: labelColor || '',
          categoryId: undefined, // check general duplicates
        });
        if (active) setSaved(isDup);
      } catch (err) {
        console.error('Failed to check duplicate:', err);
      }
    }
    checkSaved();
    return () => {
      active = false;
    };
  }, [label, message, color, logo, logoColor, style, labelColor]);

  const handleSave = useCallback(async () => {
    if (saved || saving) return;
    setSaving(true);
    try {
      await saveBadge({
        label,
        message,
        color,
        logo: logo || '',
        logoColor: logoColor || '',
        logoSize: logoSize || '',
        style,
        labelColor: labelColor || '',
        name: label ? `${label}-${message}` : message,
      });
      setSaved(true);
    } catch (err) {
      console.error('Failed to save badge from gallery:', err);
    } finally {
      setSaving(false);
    }
  }, [saved, saving, label, message, color, logo, logoColor, logoSize, style, labelColor]);

  const handleEdit = useCallback(() => {
    writeClipboard({
      label,
      message,
      color,
      logo,
      logoColor,
      logoSize,
      style,
      labelColor,
      categorySlug,
    });
    window.location.href = `${base}forge`;
  }, [label, message, color, logo, logoColor, logoSize, style, labelColor, categorySlug, base]);

  return (
    <BadgeDetailView
      label={label}
      message={message}
      color={color}
      logo={logo}
      logoColor={logoColor}
      logoSize={logoSize}
      style={style}
      labelColor={labelColor}
      header={
        <a
          href={`${base}gallery/${categorySlug}`}
          className="inline-flex items-center gap-2 text-sm text-base-content/60 hover:text-base-content transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to {categoryName}
        </a>
      }
      subtitle={
        <p className="text-sm text-base-content/50 mt-1">
          From{' '}
          <a href={`${base}gallery/${categorySlug}`} className="link link-hover">
            {categoryName}
          </a>{' '}
          gallery
        </p>
      }
      actions={
        <>
          <button
            className={`btn btn-sm gap-1 ${saved ? 'btn-success text-white' : 'btn-primary'}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span className="loading loading-spinner loading-xs" />
            ) : saved ? (
              <>
                <Check className="w-3.5 h-3.5" /> Bookmarked
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" /> Add to My Badges
              </>
            )}
          </button>
          <button className="btn btn-sm btn-outline gap-1" onClick={handleEdit}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        </>
      }
    />
  );
}
