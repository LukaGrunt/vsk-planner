import React, { useState, useEffect, useRef } from 'react';
import * as Sentry from '@sentry/react';
import { supabase } from './supabaseClient';
import { Calendar, Target, User, Users, FileText, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Plus, Edit2, Trash2, X, BarChart3, Trophy, Volume2, Send, Upload, Check, AlertCircle, Link, ExternalLink, Timer, UserPlus, RotateCcw, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

// Initialize Sentry for error monitoring
Sentry.init({
  dsn: "https://87de0b8a736fbb5f713d70ba17c24c33@o4510545349574656.ingest.de.sentry.io/4510545357111376", // Replace this with your actual Sentry DSN
  environment: window.location.hostname === 'localhost' ? 'development' : 'production',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  // Performance Monitoring
  tracesSampleRate: 0.1, // Capture 10% of transactions
  // Session Replay
  replaysSessionSampleRate: 0.1, // Record 10% of sessions
  replaysOnErrorSampleRate: 1.0, // Record 100% of sessions with errors
  // Don't send errors in development
  beforeSend(event, hint) {
    if (window.location.hostname === 'localhost') {
      return null; // Don't send to Sentry in development
    }
    return event;
  },
});

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Send error to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#0a0b0c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif'
        }}>
          <div style={{
            background: 'rgba(28, 31, 34, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '32px'
            }}>
              ⚠️
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '12px'
            }}>
              Ups! Nekaj je šlo narobe
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.6)',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              Aplikacija je naletela na napako. Ne skrbite, vaši podatki so varni. Poskusite ponovno naložiti stran.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #c1372a 0%, #a12e23 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Ponovno naloži
            </button>
            {this.state.error && (
              <details style={{
                marginTop: '24px',
                textAlign: 'left',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.4)'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                  Tehnične podrobnosti
                </summary>
                <pre style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '12px',
                  borderRadius: '8px',
                  overflow: 'auto',
                  maxHeight: '200px'
                }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const EVENT_COLORS = {
  training: { bg: '#c1372a', text: '#fff', label: 'Trening', icon: Target, calendarColor: '#c1372a' },
  competition: { bg: '#f59e0b', text: '#fff', label: 'Tekma', icon: Trophy, calendarColor: '#f59e0b' },
  announcement: { bg: '#3b82f6', text: '#fff', label: 'Obvestilo', icon: Volume2, calendarColor: '#3b82f6' },
  payment: { bg: '#10b981', text: '#fff', label: 'Plačilo', icon: FileText, calendarColor: '#10b981' }
};

// Pagination constants
const POSTS_PER_PAGE = 50;
const MEMBERS_PER_PAGE = 100;

// ============================================
// UTILITY FUNCTIONS FOR CODE STRENGTHENING
// ============================================

// Retry logic with exponential backoff for network calls
const withRetry = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

// Debounce function for input handling
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Input validation helpers
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone) => !phone || /^[\d\s+\-()]{6,20}$/.test(phone);
const sanitizeInput = (input) => input?.trim().slice(0, 500) || '';

// Safe date parsing
const safeParseDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

// Format date safely
const formatDateSafe = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
};

// Create local datetime from date + time strings (fixes timezone issues)
const createEventDateTime = (dateStr, timeStr = "23:59") => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = (timeStr || "23:59").split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
};

// Glassmorphism styles
const glassStyle = {
  background: 'rgba(28, 31, 34, 0.75)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
};

const glassCardStyle = {
  ...glassStyle,
  borderRadius: '16px',
  padding: '16px'
};

// Content padding for pages (accounts for bottom nav)
const pageContentPadding = {
  padding: '16px',
  paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
  paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 20px))'
};

// Police tape pattern for full events
const PoliceTape = () => (
  <div style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRadius: '16px',
    pointerEvents: 'none',
    zIndex: 10
  }}>
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '-20%',
      right: '-20%',
      transform: 'rotate(-15deg) translateY(-50%)',
      background: 'repeating-linear-gradient(90deg, #fbbf24 0px, #fbbf24 20px, #000 20px, #000 40px)',
      padding: '8px 0',
      textAlign: 'center',
      boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
    }}>
      <span style={{
        color: '#000',
        fontWeight: '900',
        fontSize: '14px',
        textTransform: 'uppercase',
        letterSpacing: '4px',
        textShadow: '1px 1px 0 #fbbf24'
      }}>
        POLNO • POLNO • POLNO • POLNO • POLNO • POLNO
      </span>
    </div>
  </div>
);

// Event Detail Modal
const EventDetailModal = ({ post, onClose, currentUser, onRSVP, onCancelRSVP, profileData, userRole, onCompleteTraining, onCancelTraining, t, language }) => {
  const eventConfig = EVENT_COLORS[post.type];
  const IconComponent = eventConfig?.icon || FileText;
  const currentRSVPs = post.rsvps || [];
  const isSignedUp = currentRSVPs.some(rsvp => rsvp.userId === currentUser?.uid || rsvp.email === currentUser?.email);
  const isFull = post.maxParticipants && currentRSVPs.length >= parseInt(post.maxParticipants);
  const canRSVP = (post.type === 'training' || post.type === 'competition') && currentUser;
  const isCoach = userRole === 'admin' || userRole === 'superadmin';
  
  // Check if training is in the past (using local timezone)
  const eventDateTime = createEventDateTime(post.date, post.time);
  const now = new Date();
  const isPast = eventDateTime && eventDateTime < now;

  // Check 24h lockout (calculated from event datetime, not just date)
  const lockoutDateTime = eventDateTime
    ? new Date(eventDateTime.getTime() - 24 * 60 * 60 * 1000)
    : null;
  const isLockedOut = lockoutDateTime && now > lockoutDateTime && !isPast;
  
  // AAR state
  const [showAAR, setShowAAR] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [attendance, setAttendance] = useState(() => 
    currentRSVPs.map(r => ({ ...r, present: true }))
  );
  const [trainerNotes, setTrainerNotes] = useState('');
  const [savingAAR, setSavingAAR] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
  };
  
  const handleSaveAAR = async () => {
    setSavingAAR(true);
    await onCompleteTraining(post.id, attendance, trainerNotes);
    setSavingAAR(false);
    setShowAAR(false);
    onClose();
  };

  // AAR Modal
  if (showAAR) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1001, padding: '20px'
      }}>
        <div style={{
          ...glassStyle, borderRadius: '20px', padding: '0',
          maxWidth: '450px', width: '100%', maxHeight: '85vh', overflowY: 'auto'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            padding: '20px', borderRadius: '20px 20px 0 0', position: 'relative'
          }}>
            <button onClick={() => setShowAAR(false)} style={{
              position: 'absolute', top: '12px', right: '12px',
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: '#fff'
            }}><X size={18} /></button>
            <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>Zaključi trening</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>{post.title} • {formatDate(post.date)}</p>
          </div>
          
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Kdo je bil prisoten?</h3>
              {attendance.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Nihče se ni prijavil</p>
              ) : attendance.map((person, i) => (
                <div key={i} onClick={() => {
                  const updated = [...attendance];
                  updated[i].present = !updated[i].present;
                  setAttendance(updated);
                }} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px', marginBottom: '8px', borderRadius: '10px',
                  background: person.present ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${person.present ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '6px',
                    background: person.present ? '#10b981' : 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '14px', fontWeight: '700'
                  }}>
                    {person.present ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>{person.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{person.email}</div>
                  </div>
                  <span style={{ 
                    fontSize: '11px', fontWeight: '600',
                    color: person.present ? '#10b981' : '#ef4444'
                  }}>
                    {person.present ? 'Prisoten' : 'Odsoten'}
                  </span>
                </div>
              ))}
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Opombe trenerja</h3>
              <textarea
                value={trainerNotes}
                onChange={(e) => setTrainerNotes(e.target.value)}
                placeholder="Kako je potekal trening, opažanja, priporočila..."
                rows={4}
                style={{
                  width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                  color: '#fff', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box'
                }}
              />
            </div>
            
            <button onClick={handleSaveAAR} disabled={savingAAR} style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff', border: 'none', borderRadius: '12px',
              fontSize: '15px', fontWeight: '600', cursor: 'pointer',
              opacity: savingAAR ? 0.7 : 1
            }}>
              {savingAAR ? 'Shranjujem...' : '✓ Zaključi trening'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out'
    }} onClick={onClose}>
      <div style={{
        ...glassStyle,
        borderRadius: '20px',
        padding: '0',
        maxWidth: '450px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        animation: 'slideUp 0.3s ease-out',
        position: 'relative'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Completed badge */}
        {post.completed && (
          <div style={{
            position: 'absolute', top: '16px', left: '16px', zIndex: 10,
            background: 'rgba(16, 185, 129, 0.9)', padding: '4px 10px',
            borderRadius: '6px', fontSize: '11px', fontWeight: '600', color: '#fff'
          }}>✓ Zaključeno</div>
        )}
        
        {/* Cancelled badge */}
        {post.cancelled && (
          <div style={{
            position: 'absolute', top: '16px', left: '16px', zIndex: 10,
            background: 'rgba(239, 68, 68, 0.9)', padding: '4px 10px',
            borderRadius: '6px', fontSize: '11px', fontWeight: '600', color: '#fff'
          }}>✗ Odpovedano</div>
        )}
        
        {/* Header with gradient */}
        <div style={{
          background: `linear-gradient(135deg, ${eventConfig?.bg || '#333'} 0%, ${eventConfig?.bg || '#333'}aa 100%)`,
          padding: '24px',
          borderRadius: '20px 20px 0 0',
          position: 'relative'
        }}>
          <button onClick={onClose} style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff'
          }}>
            <X size={18} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IconComponent size={24} color="#fff" />
            </div>
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#fff'
            }}>
              {eventConfig?.label}
            </span>
          </div>
          
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>
            {post.title}
          </h2>
          
          <div style={{ display: 'flex', gap: '16px', color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>
            {post.date && <span>📅 {formatDate(post.date)}</span>}
            {post.time && <span>🕐 {post.time}</span>}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {post.description && (
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', lineHeight: '1.6', marginBottom: '16px' }}>
              {post.description}
            </p>
          )}

          {post.location && (
            <div style={{
              ...glassCardStyle,
              padding: '12px 14px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '18px' }}>📍</span>
              <span style={{ color: '#fff', fontSize: '14px' }}>{post.location}</span>
            </div>
          )}

          {post.type === 'payment' && post.amount && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              <span style={{ color: '#10b981', fontSize: '24px', fontWeight: '700' }}>{post.amount} €</span>
            </div>
          )}

          {(post.type === 'training' || post.type === 'competition') && post.trainer && (
            <div style={{
              ...glassCardStyle,
              padding: '14px',
              marginBottom: '12px'
            }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Vodja / Trener</div>
              <div style={{ color: '#fff', fontWeight: '600', fontSize: '15px' }}>{post.trainer}</div>
              {post.trainerContact && (
                <a href={`tel:${post.trainerContact}`} style={{
                  color: '#3b82f6',
                  fontSize: '13px',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '4px'
                }}>
                  📞 {post.trainerContact}
                </a>
              )}
            </div>
          )}

          {/* Link button */}
          {post.linkURL && (
            <a
              href={post.linkURL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                padding: '12px 20px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '16px',
                transition: 'transform 0.2s'
              }}
            >
              <ExternalLink size={16} />
              {post.linkText || 'Odpri povezavo'}
            </a>
          )}

          {/* RSVP Section */}
          {canRSVP && (
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '16px',
              marginTop: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="#888" />
                  <span style={{ color: '#888', fontSize: '13px' }}>{t?.participants || 'Udeleženci'}</span>
                </div>
                {post.maxParticipants && (
                  <span style={{
                    background: isFull ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)',
                    color: isFull ? '#ef4444' : '#fff',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    {currentRSVPs.length}/{post.maxParticipants}
                  </span>
                )}
              </div>

              {/* Participant avatars - clickable */}
              {currentRSVPs.length > 0 && (
                <div 
                  onClick={() => setShowParticipants(true)}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px', cursor: 'pointer', padding: '8px', margin: '-8px', borderRadius: '12px', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {currentRSVPs.slice(0, 8).map((p, i) => (
                    <div key={i} style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: `hsl(${(p.email?.charCodeAt(0) || 0) * 10 % 360}, 60%, 45%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#fff',
                      border: '2px solid rgba(255,255,255,0.2)'
                    }}>
                      {p.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
                    </div>
                  ))}
                  {currentRSVPs.length > 8 && (
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#888'
                    }}>
                      +{currentRSVPs.length - 8}
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginLeft: '4px',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '12px'
                  }}>
                    <ChevronRight size={16} />
                  </div>
                </div>
              )}

              {/* Participants List Popup */}
              {showParticipants && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1002,
                  padding: '20px'
                }} onClick={() => setShowParticipants(false)}>
                  <div style={{
                    background: 'linear-gradient(135deg, #1a1b1e 0%, #141516 100%)',
                    borderRadius: '20px',
                    padding: '24px',
                    maxWidth: '340px',
                    width: '100%',
                    maxHeight: '70vh',
                    overflowY: 'auto',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={22} color="#10b981" />
                        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', margin: 0 }}>
                          {t?.participants || 'Udeleženci'} ({currentRSVPs.length})
                        </h3>
                      </div>
                      <button 
                        onClick={() => setShowParticipants(false)}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#fff'
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {currentRSVPs.map((p, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: '12px'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: `hsl(${(p.email?.charCodeAt(0) || 0) * 10 % 360}, 60%, 45%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '700',
                            color: '#fff',
                            flexShrink: 0
                          }}>
                            {p.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>
                              {p.name || (t?.unknown || 'Neznan')}
                            </div>
                          </div>
                          {p.userId === currentUser?.uid && (
                            <div style={{
                              background: 'rgba(16, 185, 129, 0.2)',
                              color: '#10b981',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              {t?.you || 'Ti'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {isPast || isLockedOut ? (
                <div style={{
                  background: 'rgba(107, 114, 128, 0.2)',
                  color: '#9ca3af',
                  padding: '14px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  fontSize: '15px',
                  fontWeight: '600'
                }}>
                  {isPast ? 'Dogodek je mimo' : 'Prijave zaprte'}
                </div>
              ) : isSignedUp ? (
                <button
                  onClick={() => onCancelRSVP(post.id)}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ✓ Prijavljen/a — Odjavi se
                </button>
              ) : !isFull ? (
                <button
                  onClick={() => onRSVP(post.id)}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Prijavi se na dogodek
                </button>
              ) : (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  padding: '14px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  fontSize: '15px',
                  fontWeight: '600'
                }}>
                  Dogodek je poln
                </div>
              )}
            </div>
          )}
          
          {/* 24h lockout message */}
          {canRSVP && isLockedOut && !post.cancelled && !post.completed && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#f59e0b',
              padding: '12px',
              borderRadius: '10px',
              fontSize: '13px',
              textAlign: 'center',
              marginTop: '12px'
            }}>
              ⏰ Prijave zaklenjene 24h pred dogodkom
            </div>
          )}
          
          {/* Coach buttons */}
          {isCoach && canRSVP && !post.cancelled && !post.completed && (
            <div style={{ 
              borderTop: '1px solid rgba(255,255,255,0.1)', 
              paddingTop: '16px', 
              marginTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Možnosti trenerja
              </div>
              
              {isPast && (
                <button onClick={() => setShowAAR(true)} style={{
                  width: '100%', padding: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                  ✓ Zaključi trening
                </button>
              )}
              
              <button onClick={() => onCancelTraining(post.id)} style={{
                width: '100%', padding: '12px',
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}>
                ✗ Odpovej trening
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PostForm = ({ post, onSave, onCancel, members, t }) => {
  const [formData, setFormData] = useState(() => {
    if (post && post.id) return post;
    const defaultType = post?.type || 'training';
    const showInNewsDefault = defaultType === 'announcement' || defaultType === 'payment';
    return {
      title: '', description: '', type: defaultType, date: '', time: '', location: '',
      showInNews: showInNewsDefault, amount: '', maxParticipants: '', trainer: '',
      trainerContact: '', rsvps: [], linkURL: '', linkText: '', hasLink: false,
      ...post
    };
  });

  const handleTypeChange = (newType) => {
    const showInNewsDefault = newType === 'announcement' || newType === 'payment';
    setFormData({ ...formData, type: newType, showInNews: showInNewsDefault });
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: '20px'
    }}>
      <div style={{
        ...glassStyle, borderRadius: '20px', padding: '24px', maxWidth: '500px',
        width: '100%', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>
            {formData.id ? t.editPost : t.newPost}
          </h2>
          <button onClick={onCancel} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: '14px' }}>
          {/* Type selector */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px' }}>{t.type}</label>
            <select value={formData.type} onChange={(e) => handleTypeChange(e.target.value)} style={{
              width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', color: '#fff', fontSize: '14px'
            }}>
              <option value="training">{t.training}</option>
              <option value="competition">{t.match}</option>
              <option value="announcement">{t.announcement}</option>
              <option value="payment">{t.payment}</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px' }}>{t.title}</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px' }}>{t.description}</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          {/* Payment amount */}
          {formData.type === 'payment' && (
            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px' }}>{t.amount}</label>
              <input type="text" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="€50"
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
          )}

          {/* Training/Competition fields */}
          {(formData.type === 'training' || formData.type === 'competition') && (
            <>
              <div>
                <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px' }}>{t.maxParticipants}</label>
                <input type="number" value={formData.maxParticipants} onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })} placeholder="8"
                  style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ ...glassCardStyle, padding: '14px' }}>
                <label style={{ display: 'block', color: '#c1372a', fontSize: '12px', marginBottom: '10px', fontWeight: '600' }}>👤 {t.leaderTrainer}</label>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <select value={formData.trainer} onChange={(e) => {
                    const selectedMember = members?.find(m => `${m.ime} ${m.priimek}` === e.target.value);
                    setFormData({ ...formData, trainer: e.target.value, trainerContact: selectedMember?.telefon || '' });
                  }} style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}>
                    <option value="">{t.selectLeader}</option>
                    {members?.map((member, index) => (
                      <option key={index} value={`${member.ime} ${member.priimek}`}>{member.ime} {member.priimek}</option>
                    ))}
                  </select>
                  <input type="tel" value={formData.trainerContact} onChange={(e) => setFormData({ ...formData, trainerContact: e.target.value })} placeholder={t.contactPlaceholder}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>
            </>
          )}

          {/* Date & Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px' }}>{t.date}</label>
              <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', colorScheme: 'dark' }} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px' }}>{t.time}</label>
              <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', colorScheme: 'dark' }} />
            </div>
          </div>

          {/* Location */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px' }}>{t.location}</label>
            <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          {/* Link toggle and fields */}
          <div style={{ ...glassCardStyle, padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: formData.hasLink ? '12px' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link size={16} color="#3b82f6" />
                <span style={{ color: '#fff', fontSize: '13px' }}>{t.addLink}</span>
              </div>
              <button onClick={() => setFormData({ ...formData, hasLink: !formData.hasLink })} style={{
                width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: formData.hasLink ? '#3b82f6' : 'rgba(255,255,255,0.2)', position: 'relative', transition: 'background 0.2s'
              }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute',
                  top: '2px', left: formData.hasLink ? '22px' : '2px', transition: 'left 0.2s'
                }} />
              </button>
            </div>
            {formData.hasLink && (
              <div style={{ display: 'grid', gap: '10px' }}>
                <input type="url" value={formData.linkURL} onChange={(e) => setFormData({ ...formData, linkURL: e.target.value })} placeholder="https://..."
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                <input type="text" value={formData.linkText} onChange={(e) => setFormData({ ...formData, linkText: e.target.value })} placeholder={t.linkButtonText}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
            )}
          </div>

          {/* Show in news toggle */}
          <div style={{ ...glassCardStyle, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={formData.showInNews} onChange={(e) => setFormData({ ...formData, showInNews: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#c1372a' }} />
              <label style={{ color: '#fff', fontSize: '13px' }}>{t.showInNews}</label>
            </div>
            <span style={{ color: '#888', fontSize: '11px' }}>
              {formData.type === 'training' || formData.type === 'competition' ? t.defaultOff : t.defaultOn}
            </span>
          </div>

          {/* Save button */}
          <button onClick={() => onSave(formData)} style={{
            width: '100%', background: 'linear-gradient(135deg, #c1372a 0%, #9a2c22 100%)', color: '#fff',
            padding: '14px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '8px'
          }}>
            {formData.id ? t.save : t.create}
          </button>
        </div>
      </div>
    </div>
  );
};

// CSV Import Modal
const CSVImportModal = ({ onClose, onImport, t }) => {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) { setError('CSV mora vsebovati glavo in vsaj eno vrstico podatkov'); setPreview([]); return; }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['tip', 'naslov', 'datum'];
    const missing = requiredHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) { setError(`Manjkajoči stolpci: ${missing.join(', ')}`); setPreview([]); return; }
    const events = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',').map(v => v.trim());
      const event = {};
      headers.forEach((header, index) => { event[header] = values[index] || ''; });
      const typeMap = { 'trening': 'training', 'training': 'training', 'tekma': 'competition', 'competition': 'competition', 'obvestilo': 'announcement', 'announcement': 'announcement', 'plačilo': 'payment', 'placilo': 'payment', 'payment': 'payment' };
      const mappedEvent = {
        type: typeMap[event.tip?.toLowerCase()] || 'training', title: event.naslov || '', description: event.opis || '',
        date: event.datum || '', time: event.cas || event.čas || '', location: event.lokacija || '',
        trainer: event.vodja || event.trener || '', trainerContact: event.kontakt || '', maxParticipants: event.maks || event.max || '',
        showInNews: false, rsvps: []
      };
      if (mappedEvent.title && mappedEvent.date) events.push(mappedEvent);
    }
    if (events.length === 0) { setError('Ni veljavnih dogodkov v CSV'); setPreview([]); return; }
    setError(''); setPreview(events);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => { const text = event.target.result; setCsvText(text); parseCSV(text); };
      reader.readAsText(file);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ ...glassStyle, borderRadius: '20px', padding: '24px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>📥 {t.importCSV}</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
        </div>
        <div style={{ ...glassCardStyle, marginBottom: '16px' }}>
          <p style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>{t.requiredColumns}:</p>
          <code style={{ color: '#10b981', fontSize: '11px' }}>tip, naslov, datum</code>
          <p style={{ color: '#888', fontSize: '12px', marginTop: '8px', marginBottom: '8px' }}>{t.optionalColumns}:</p>
          <code style={{ color: '#888', fontSize: '11px' }}>{t.csvOptional}</code>
        </div>
        <input type="file" ref={fileInputRef} accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
        <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: '14px', ...glassCardStyle, border: '2px dashed rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#fff', fontSize: '14px', marginBottom: '12px' }}>
          <Upload size={18} /> {t.uploadCSVFile}
        </button>
        <textarea value={csvText} onChange={(e) => { setCsvText(e.target.value); if (e.target.value.trim()) parseCSV(e.target.value); else { setPreview([]); setError(''); } }} placeholder={t.csvPlaceholder}
          style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '12px', fontFamily: 'monospace', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' }} />
        {error && <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '10px', padding: '10px 12px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={16} color="#ef4444" /><span style={{ color: '#ef4444', fontSize: '13px' }}>{error}</span></div>}
        {preview.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <span style={{ color: '#10b981', fontSize: '13px', fontWeight: '600' }}><Check size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{preview.length} {t.eventsReady}</span>
            <div style={{ maxHeight: '150px', overflowY: 'auto', ...glassCardStyle, marginTop: '10px', padding: '0' }}>
              {preview.map((event, index) => (
                <div key={index} style={{ padding: '8px 12px', borderBottom: index < preview.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: EVENT_COLORS[event.type]?.bg || '#888', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>{EVENT_COLORS[event.type]?.label || event.type}</span>
                  <span style={{ color: '#fff', fontSize: '12px', flex: 1 }}>{event.title}</span>
                  <span style={{ color: '#888', fontSize: '11px' }}>{event.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', ...glassCardStyle, cursor: 'pointer', color: '#fff', fontSize: '14px', textAlign: 'center' }}>{t.cancel}</button>
          <button onClick={() => onImport(preview)} disabled={preview.length === 0} style={{ flex: 1, padding: '12px', background: preview.length > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: preview.length > 0 ? 'pointer' : 'not-allowed', opacity: preview.length > 0 ? 1 : 0.5 }}>
            {t.import} {preview.length > 0 ? `(${preview.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

// Popup Form Component for Admin
const PopupForm = ({ popup, onSave, onCancel, t }) => {
  const [formData, setFormData] = useState({
    title: popup?.title || '',
    description: popup?.description || '',
    deadline: popup?.deadline || '',
    buttonText: popup?.buttonText || '',
    buttonURL: popup?.buttonURL || '',
    active: popup?.active !== undefined ? popup.active : true,
    showDeadline: popup?.showDeadline || false,
    showButton: popup?.showButton || false,
    ...popup
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: '20px'
    }}>
      <div style={{
        ...glassCardStyle, padding: '24px', borderRadius: '20px',
        width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>
            {formData.id ? t.editPopup : t.newPopup}
          </h2>
          <button onClick={onCancel} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: '14px' }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px' }}>{t.title}</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t.notificationTitle}
              style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px' }}>{t.content}</label>
            <textarea 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t.notificationContent}
              rows={4}
              style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          {/* Deadline toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
            <span style={{ color: '#fff', fontSize: '14px' }}>{t.showDeadline}</span>
            <button 
              onClick={() => setFormData({ ...formData, showDeadline: !formData.showDeadline })}
              style={{ 
                width: '50px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer',
                background: formData.showDeadline ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.1)',
                position: 'relative', transition: 'background 0.2s'
              }}
            >
              <div style={{ 
                width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                position: 'absolute', top: '3px', transition: 'left 0.2s',
                left: formData.showDeadline ? '27px' : '3px'
              }} />
            </button>
          </div>

          {formData.showDeadline && (
            <input 
              type="date" 
              value={formData.deadline} 
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
            />
          )}

          {/* Button toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
            <span style={{ color: '#fff', fontSize: '14px' }}>{t.showButton}</span>
            <button 
              onClick={() => setFormData({ ...formData, showButton: !formData.showButton })}
              style={{ 
                width: '50px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer',
                background: formData.showButton ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.1)',
                position: 'relative', transition: 'background 0.2s'
              }}
            >
              <div style={{ 
                width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                position: 'absolute', top: '3px', transition: 'left 0.2s',
                left: formData.showButton ? '27px' : '3px'
              }} />
            </button>
          </div>

          {formData.showButton && (
            <>
              <input 
                type="text" 
                value={formData.buttonText} 
                onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                placeholder={t.buttonText}
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <input 
                type="url" 
                value={formData.buttonURL} 
                onChange={(e) => setFormData({ ...formData, buttonURL: e.target.value })}
                placeholder="https://..."
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </>
          )}

          {/* Active toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <span style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>{t.activeShowsToUsers}</span>
            <button 
              onClick={() => setFormData({ ...formData, active: !formData.active })}
              style={{ 
                width: '50px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer',
                background: formData.active ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.1)',
                position: 'relative', transition: 'background 0.2s'
              }}
            >
              <div style={{ 
                width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                position: 'absolute', top: '3px', transition: 'left 0.2s',
                left: formData.active ? '27px' : '3px'
              }} />
            </button>
          </div>

          {/* Save button */}
          <button 
            onClick={() => onSave(formData)}
            style={{ 
              width: '100%', padding: '14px', 
              background: 'linear-gradient(135deg, #c1372a 0%, #9a2c22 100%)', 
              color: '#fff', border: 'none', borderRadius: '12px', 
              fontSize: '15px', fontWeight: '600', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(193, 55, 42, 0.3)'
            }}
          >
            {formData.id ? t.saveChanges : t.createPopup}
          </button>
        </div>
      </div>
    </div>
  );
};

// Popup Display Modal for Users
const PopupModal = ({ popup, onDismiss }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 2000, padding: '20px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        ...glassCardStyle, 
        padding: '0', 
        borderRadius: '24px',
        width: '100%', 
        maxWidth: '380px',
        overflow: 'hidden',
        animation: 'slideUp 0.3s ease-out',
        border: '1px solid rgba(193, 55, 42, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #c1372a 0%, #9a2c22 100%)',
          padding: '20px',
          position: 'relative'
        }}>
          <button 
            onClick={onDismiss}
            style={{ 
              position: 'absolute', top: '12px', right: '12px',
              background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '50%', 
              width: '32px', height: '32px', cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>
            {popup.title}
          </h2>
          {popup.showDeadline && popup.deadline && (
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
              Rok: {formatDate(popup.deadline)}
            </p>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {popup.description}
          </p>

          {popup.showButton && popup.buttonText && popup.buttonURL && (
            <a 
              href={popup.buttonURL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                textAlign: 'center',
                textDecoration: 'none',
                marginTop: '16px',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
              }}
            >
              {popup.buttonText}
            </a>
          )}

          <button 
            onClick={onDismiss}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              cursor: 'pointer',
              marginTop: '12px'
            }}
          >
            Zapri
          </button>
        </div>
      </div>
    </div>
  );
};

// Slim Event Card with glassmorphism
const SlimEventCard = ({ post, onShowDetail }) => {
  const eventConfig = EVENT_COLORS[post.type];
  if (!eventConfig) return null;
  const IconComponent = eventConfig.icon;
  const currentRSVPs = post.rsvps || [];
  const isFull = post.maxParticipants && currentRSVPs.length >= parseInt(post.maxParticipants);
  const showTitle = post.type === 'announcement' || post.type === 'payment';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
  };

  return (
    <div 
      onClick={() => onShowDetail(post)}
      style={{
        ...glassCardStyle,
        padding: '14px 16px',
        marginBottom: '10px',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {isFull && <PoliceTape />}
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <span style={{
            background: `linear-gradient(135deg, ${eventConfig.bg} 0%, ${eventConfig.bg}cc 100%)`,
            color: eventConfig.text,
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            flexShrink: 0,
            boxShadow: `0 2px 8px ${eventConfig.bg}44`
          }}>
            <IconComponent size={12} />
            {eventConfig.label}
          </span>
          {showTitle && (
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {post.title}
            </span>
          )}
          {!showTitle && post.date && (
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>{formatDate(post.date)}</span>
          )}
          {!showTitle && post.time && (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{post.time}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {post.linkURL && <Link size={14} color="#3b82f6" />}
          {showTitle && post.date && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{formatDate(post.date)}</span>}
          {showTitle && post.time && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{post.time}</span>}
          <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
        </div>
      </div>
    </div>
  );
};

// Role-based colors
const ROLE_COLORS = {
  superadmin: { bg: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', label: 'Super Admin', short: 'SA' },
  admin: { bg: '#c1372a', gradient: 'linear-gradient(135deg, #c1372a 0%, #9a2c22 100%)', label: 'Trener', short: 'T' },
  user: { bg: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', label: 'Član', short: 'Č' }
};

const MEMBER_COLORS = ['#c1372a', '#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#dc2626', '#059669', '#7c2d12', '#be185d', '#4338ca', '#ca8a04'];
const getUserColor = (userEmail, role) => {
  // If role is provided, use role-based color
  if (role && ROLE_COLORS[role]) return ROLE_COLORS[role].bg;
  // Fallback to hash-based color
  if (!userEmail) return MEMBER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < userEmail.length; i++) hash = ((hash << 5) - hash) + userEmail.charCodeAt(i);
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
};

const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') return (await Notification.requestPermission()) === 'granted';
  return false;
};

const sendNotification = async (title, body) => {
  if (Notification.permission === 'granted') {
    try {
      // Use Service Worker notification (works on mobile)
      const registration = await navigator.serviceWorker?.ready;
      if (registration) {
        await registration.showNotification(title, { 
          body, 
          vibrate: [200, 100, 200],
          icon: '/logo192.png'
        });
      } else {
        // Fallback for desktop without SW
        new Notification(title, { body });
      }
    } catch (e) {
      // Notification error silently ignored
    }
  }
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home');
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [lastPostDoc, setLastPostDoc] = useState(null);
  const [hasMoreMembers, setHasMoreMembers] = useState(false);
  const [lastMemberDoc, setLastMemberDoc] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [profileData, setProfileData] = useState({ ime: '', priimek: '', email: '', telefon: '', morsStevilo: '', orozneListine: [] });
  const [editingProfile, setEditingProfile] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loginAnimation, setLoginAnimation] = useState(false);
  const [activePopup, setActivePopup] = useState(null);
  const [popups, setPopups] = useState([]);
  const [editingPopup, setEditingPopup] = useState(null);
  const [dismissedPopups, setDismissedPopups] = useState([]);
  const [statsTab, setStatsTab] = useState('attendance');
  const [showSplash, setShowSplash] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [featuredArticle, setFeaturedArticle] = useState(null);
  const [editingFeatured, setEditingFeatured] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('vsk-language') || 'sl');
  const [cancelledNotification, setCancelledNotification] = useState(null);
  
  // Toast notification state
  const [toast, setToast] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Operation tracking to prevent double-clicks
  const [operationInProgress, setOperationInProgress] = useState({});

  // User registration form state
  const [showNewMemberForm, setShowNewMemberForm] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    email: '', ime: '', priimek: '', telefon: '', morsStevilo: '', role: 'user', password: ''
  });

  // Toast helper function
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  
  // Safe operation wrapper - prevents double-clicks and handles errors
  const safeOperation = async (operationId, fn) => {
    if (operationInProgress[operationId]) return; // Already in progress
    if (isOffline) {
      showToast(language === 'en' ? 'No internet connection' : 'Ni internetne povezave', 'error');
      return;
    }
    setOperationInProgress(prev => ({ ...prev, [operationId]: true }));
    try {
      await fn();
    } catch (e) {
      showToast((t.error || 'Napaka') + ': ' + e.message, 'error');
    } finally {
      setOperationInProgress(prev => ({ ...prev, [operationId]: false }));
    }
  };
  
  // Training Match State (no Firebase - local only)
  const [matchPhase, setMatchPhase] = useState('setup'); // setup, entry, results
  const [matchShooters, setMatchShooters] = useState([]);
  const [matchGuests, setMatchGuests] = useState([]);
  const [matchCurrentStage, setMatchCurrentStage] = useState(1);
  const [matchRuns, setMatchRuns] = useState([]);
  const [matchCurrentShooterIndex, setMatchCurrentShooterIndex] = useState(0);
  const [matchTimeInput, setMatchTimeInput] = useState('');
  const [matchPenalties, setMatchPenalties] = useState(0);
  const [showKeypad, setShowKeypad] = useState(false);
  const [cancelledTrainingAlert, setCancelledTrainingAlert] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false);
  
  // Save language preference
  useEffect(() => {
    localStorage.setItem('vsk-language', language);
  }, [language]);
  
  // Translations
  const t = {
    sl: {
      // Navigation
      news: 'Novice',
      calendar: 'Koledar', 
      chat: 'Klepet',
      profile: 'Profil',
      admin: 'Admin',
      // Common
      save: 'Shrani',
      cancel: 'Prekliči',
      delete: 'Izbriši',
      edit: 'Uredi',
      close: 'Zapri',
      back: 'Nazaj',
      next: 'Naprej',
      confirm: 'Potrdi',
      create: 'Ustvari',
      add: 'Dodaj',
      remove: 'Odstrani',
      yes: 'Da',
      no: 'Ne',
      error: 'Napaka',
      success: 'Uspešno',
      loading: 'Nalaganje...',
      saving: 'Shranjujem...',
      // Login
      login: 'Prijava',
      email: 'Email',
      password: 'Geslo',
      forgotPassword: 'Pozabljeno geslo?',
      resetPassword: 'Ponastavi geslo',
      welcome: 'Dobrodošli',
      clubName: 'Vojaški strelski klub',
      emailSent: 'Email poslan',
      enterEmail: 'Vnesite email',
      // Events
      training: 'Trening',
      match: 'Tekma',
      announcement: 'Obvestilo',
      payment: 'Plačilo',
      signUp: 'Prijavi se',
      signOff: 'Odjavi se',
      signedUp: 'Prijavljen',
      spotsLeft: 'prostih mest',
      signupsLocked: 'Prijave zaklenjene 24h pred dogodkom',
      noEvents: 'Ni dogodkov',
      alreadySignedUp: 'Že ste prijavljeni na ta dogodek',
      signupSuccess: 'Uspešno prijavljeni!',
      signupCancelled: 'Prijava preklicana',
      openLink: 'Odpri povezavo',
      participants: 'Udeleženci',
      noSignups: 'Nihče se ni prijavil',
      you: 'Ti',
      unknown: 'Neznan',
      // Calendar
      today: 'Danes',
      dayNames: ['P', 'T', 'S', 'Č', 'P', 'S', 'N'],
      trainingsInCalendar: 'Treningi in tekme najdeš v koledarju',
      // Chat
      noMessages: 'Ni sporočil',
      typeMessage: 'Napiši sporočilo...',
      deleteMessage: 'Izbriši sporočilo?',
      message: 'Sporočilo...',
      // Profile
      firstName: 'Ime',
      lastName: 'Priimek',
      phone: 'Telefon',
      morsNumber: 'MORS številka',
      changePassword: 'Spremeni geslo',
      currentPassword: 'Trenutno geslo',
      newPassword: 'Novo geslo',
      confirmPassword: 'Potrdi geslo',
      newPasswordMin: 'Novo geslo (min. 7 znakov)',
      passwordChanged: 'Geslo spremenjeno',
      logout: 'Odjava',
      support: 'Podpora',
      language: 'Jezik',
      membershipPaid: 'Članarina plačana',
      membershipNotPaid: 'Članarina ni plačana',
      notifications: 'Obvestila',
      enabled: 'Vklopljeno',
      enable: 'Vklopi',
      enableInSettings: 'Omogočite v nastavitvah',
      change: 'Spremeni',
      weaponLicenses: 'Orožne listine',
      licenseType: 'Vrsta',
      licenseNumber: 'Št.',
      superAdmin: 'Super Admin',
      trainer: 'Trener',
      member: 'Član',
      // Admin
      postsEvents: 'Objave & Dogodki',
      createEditDelete: 'Ustvari, uredi, izbriši',
      trainingStats: 'Statistika treningov',
      attendanceAbsenceNotes: 'Prisotnost, odsotnost, opombe',
      trainingMatch: 'Trening Tekma',
      resultsExport: 'Rezultati in izpis',
      popupNotifications: 'Popup obvestila',
      specialNotifications: 'Posebna obvestila za člane',
      featuredArticle: 'Izpostavljen članek',
      promoteArticle: 'Promociraj članek na Novicah',
      importCSV: 'Uvozi iz CSV',
      bulkImport: 'Množični uvoz dogodkov',
      members: 'Člani',
      membersCount: 'Članov',
      membershipStatus: 'Članarina',
      rolesMembership: 'Vloge, članarina',
      paid: 'Plačano',
      notPaid: 'Neplačano',
      // Post/Event form
      newPost: 'Nova objava',
      editPost: 'Uredi objavo',
      title: 'Naslov',
      description: 'Opis',
      maxParticipants: 'Maks. udeležencev',
      date: 'Datum',
      time: 'Čas',
      location: 'Lokacija',
      noLocation: 'Brez lokacije',
      addLink: 'Dodaj povezavo',
      linkUrl: 'URL povezave',
      linkButtonText: "Besedilo gumba (npr. 'Prijava')",
      showInNews: 'Prikaži v novicah',
      defaultOff: '(privzeto izključeno)',
      defaultOn: '(privzeto vključeno)',
      // Popup form
      newPopup: 'Novo obvestilo',
      editPopup: 'Uredi obvestilo',
      showDeadline: 'Prikaži rok',
      showButton: 'Prikaži gumb',
      activeShowsToUsers: 'Aktivno (prikaže se uporabnikom)',
      createPopup: 'Ustvari obvestilo',
      saveChanges: 'Shrani spremembe',
      createNewPopup: 'Ustvari novo popup obvestilo',
      // Featured article
      showOnNews: 'Prikaži na strani Novice',
      readMore: 'Preberi več',
      articleTitle: 'Naslov',
      articleDescription: 'Opis članka...',
      // CSV import
      missingColumns: 'Manjkajoči stolpci',
      csvPlaceholder: 'tip,naslov,datum,čas,lokacija...',
      csvOptional: 'opis, čas, lokacija, vodja, kontakt, maks',
      importError: 'Napaka pri uvozu',
      // Training completion
      completeTraining: 'Zaključi trening',
      cancelTraining: 'Odpovej trening',
      confirmCancel: 'Ali res želite odpovedati ta trening?',
      trainingCancelled: 'Trening odpovedan',
      trainingCompleted: 'Trening zaključen!',
      completed: 'Zaključeno',
      cancelled: 'Odpovedano',
      coachOptions: 'Možnosti trenerja',
      trainerNotes: 'Opombe trenerja',
      howWasTraining: 'Kako je potekal trening, opažanja, priporočila...',
      attendance: 'Prisotnost',
      absence: 'Odsotnost',
      notes: 'Opombe',
      present: 'Prisoten',
      absent: 'Odsoten',
      timesAbsent: 'odsoten',
      trainings: 'treningov',
      allPresent: 'Vsi člani so bili prisotni! 🎉',
      noTrainerNotes: 'Ni opomb trenerjev',
      noCompletedTrainings: 'Ni zaključenih treningov',
      statsAfterCompletion: 'Statistika se bo prikazala po zaključku treningov',
      // Training Match
      searchMember: 'Išči člana...',
      clubMembers: 'Člani kluba',
      noMembersFound: 'Ni najdenih članov',
      guests: 'Gostje',
      addGuest: 'Dodaj gosta',
      guestName: 'Ime gosta',
      selectedShooters: 'Izbrani strelci',
      startMatch: 'ZAČNI TEKMO',
      selectAtLeastOne: 'Izberi vsaj enega strelca!',
      stage: 'STAGE',
      shooter: 'STRELEC',
      timeSeconds: 'ČAS (sekunde)',
      penalties: 'KAZNI',
      resetPenalties: 'Ponastavi kazni',
      total: 'SKUPAJ',
      alreadyEntered: 'Že vneseno',
      enterValidTime: 'Vnesi veljaven čas!',
      newStage: '+ NEW STAGE',
      results: 'REZULTATI',
      saveAsImage: '📷 SHRANI KOT SLIKO',
      finish: 'Končaj',
      shooters: 'strelcev',
      stages: 'stages',
      raw: 'Raw',
      pen: 'Pen',
      matchResultsTitle: 'Trening Tekma Rezultati',
      exportError: 'Napaka pri izvozu',
      // Cancelled notification
      trainingCancelledNotif: 'Trening odpovedan',
      wasCancelled: 'je bil odpovedan',
      // Refresh
      refresh: 'Osveži',
      refreshed: 'Osveženo',
      refreshing: 'Osvežujem...',
      // Confirmations & Alerts
      deleteConfirm: 'Izbrisati?',
      saved: 'Shranjeno',
      deleted: 'Izbrisano',
      eventNotFound: 'Dogodek ne obstaja',
      eventFull: 'Dogodek je poln',
      checkInput: 'Preverite vnos',
      enterPassword: 'Vnesite geslo',
      importSuccess: 'Uspešno uvoženih',
      events: 'dogodkov',
      // Additional keys for forms
      type: 'Tip',
      amount: 'Znesek',
      leaderTrainer: 'Vodja / Trener',
      selectLeader: 'Izberi vodjo...',
      contactPlaceholder: 'Kontakt: +386 XX XXX XXX',
      full: 'POLNO',
      signUpForEvent: 'Prijavi se na dogodek',
      deadline: 'Rok',
      whoWasPresent: 'Kdo je bil prisoten?',
      noNews: 'Ni novic',
      lastLogin: 'Zadnja prijava',
      notificationTitle: 'Naslov obvestila',
      notificationContent: 'Vsebina obvestila...',
      content: 'Besedilo',
      buttonText: 'Besedilo gumba',
      articleTitlePlaceholder: 'Npr: Uspešno tekmovanje v Ljubljani',
      shortDescription: 'Kratek opis članka...',
      linkURL: 'Povezava (URL)',
      buttonTextOnButton: 'Besedilo na gumbu',
      buttonTextPlaceholder: 'Npr: Preberi članek',
      preview: 'Predogled',
      requiredColumns: 'Obvezni stolpci',
      optionalColumns: 'Opcijski stolpci',
      uploadCSVFile: 'Naloži CSV datoteko',
      eventsReady: 'dogodkov pripravljenih',
      csvNeedsHeaderAndData: 'CSV mora vsebovati glavo in vsaj eno vrstico podatkov',
      noValidEventsInCSV: 'Ni veljavnih dogodkov v CSV',
      import: 'Uvozi',
      noNotifications: 'Ni obvestil',
    },
    en: {
      // Navigation
      news: 'News',
      calendar: 'Calendar',
      chat: 'Chat', 
      profile: 'Profile',
      admin: 'Admin',
      // Common
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      confirm: 'Confirm',
      create: 'Create',
      add: 'Add',
      remove: 'Remove',
      yes: 'Yes',
      no: 'No',
      error: 'Error',
      success: 'Success',
      loading: 'Loading...',
      saving: 'Saving...',
      // Login
      login: 'Login',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot password?',
      resetPassword: 'Reset password',
      welcome: 'Welcome',
      clubName: 'Military Shooting Club',
      emailSent: 'Email sent',
      enterEmail: 'Enter email',
      // Events
      training: 'Training',
      match: 'Match',
      announcement: 'Announcement',
      payment: 'Payment',
      signUp: 'Sign up',
      signOff: 'Sign off',
      signedUp: 'Signed up',
      spotsLeft: 'spots left',
      signupsLocked: 'Sign-ups locked 24h before event',
      noEvents: 'No events',
      alreadySignedUp: 'You are already signed up for this event',
      signupSuccess: 'Successfully signed up!',
      signupCancelled: 'Sign-up cancelled',
      openLink: 'Open link',
      participants: 'Participants',
      noSignups: 'No one signed up',
      you: 'You',
      unknown: 'Unknown',
      // Calendar
      today: 'Today',
      dayNames: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      trainingsInCalendar: 'Trainings and matches are in the calendar',
      // Chat
      noMessages: 'No messages',
      typeMessage: 'Type a message...',
      deleteMessage: 'Delete message?',
      message: 'Message...',
      // Profile
      firstName: 'First name',
      lastName: 'Last name',
      phone: 'Phone',
      morsNumber: 'MORS number',
      changePassword: 'Change password',
      currentPassword: 'Current password',
      newPassword: 'New password',
      confirmPassword: 'Confirm password',
      newPasswordMin: 'New password (min. 7 characters)',
      passwordChanged: 'Password changed',
      logout: 'Logout',
      support: 'Support',
      language: 'Language',
      membershipPaid: 'Membership paid',
      membershipNotPaid: 'Membership not paid',
      notifications: 'Notifications',
      enabled: 'Enabled',
      enable: 'Enable',
      enableInSettings: 'Enable in settings',
      change: 'Change',
      weaponLicenses: 'Weapon licenses',
      licenseType: 'Type',
      licenseNumber: 'No.',
      superAdmin: 'Super Admin',
      trainer: 'Trainer',
      member: 'Member',
      // Admin
      postsEvents: 'Posts & Events',
      createEditDelete: 'Create, edit, delete',
      trainingStats: 'Training Statistics',
      attendanceAbsenceNotes: 'Attendance, absence, notes',
      trainingMatch: 'Training Match',
      resultsExport: 'Results and export',
      popupNotifications: 'Popup notifications',
      specialNotifications: 'Special notifications for members',
      featuredArticle: 'Featured article',
      promoteArticle: 'Promote article on News',
      importCSV: 'Import from CSV',
      bulkImport: 'Bulk import events',
      members: 'Members',
      membersCount: 'Members',
      membershipStatus: 'Membership',
      rolesMembership: 'Roles, membership',
      paid: 'Paid',
      notPaid: 'Not paid',
      // Post/Event form
      newPost: 'New post',
      editPost: 'Edit post',
      title: 'Title',
      description: 'Description',
      maxParticipants: 'Max participants',
      date: 'Date',
      time: 'Time',
      location: 'Location',
      noLocation: 'No location',
      addLink: 'Add link',
      linkUrl: 'Link URL',
      linkButtonText: "Button text (e.g. 'Register')",
      showInNews: 'Show in news',
      defaultOff: '(default off)',
      defaultOn: '(default on)',
      // Popup form
      newPopup: 'New notification',
      editPopup: 'Edit notification',
      showDeadline: 'Show deadline',
      showButton: 'Show button',
      activeShowsToUsers: 'Active (shows to users)',
      createPopup: 'Create notification',
      saveChanges: 'Save changes',
      createNewPopup: 'Create new popup notification',
      // Featured article
      showOnNews: 'Show on News page',
      readMore: 'Read more',
      articleTitle: 'Title',
      articleDescription: 'Article description...',
      // CSV import
      missingColumns: 'Missing columns',
      csvPlaceholder: 'type,title,date,time,location...',
      csvOptional: 'description, time, location, leader, contact, max',
      importError: 'Import error',
      // Training completion
      completeTraining: 'Complete training',
      cancelTraining: 'Cancel training',
      confirmCancel: 'Are you sure you want to cancel this training?',
      trainingCancelled: 'Training cancelled',
      trainingCompleted: 'Training completed!',
      completed: 'Completed',
      cancelled: 'Cancelled',
      coachOptions: 'Coach options',
      trainerNotes: 'Trainer notes',
      howWasTraining: 'How was the training, observations, recommendations...',
      attendance: 'Attendance',
      absence: 'Absence',
      notes: 'Notes',
      present: 'Present',
      absent: 'Absent',
      timesAbsent: 'absent',
      trainings: 'trainings',
      allPresent: 'All members were present! 🎉',
      noTrainerNotes: 'No trainer notes',
      noCompletedTrainings: 'No completed trainings',
      statsAfterCompletion: 'Statistics will appear after completing trainings',
      // Training Match
      searchMember: 'Search member...',
      clubMembers: 'Club members',
      noMembersFound: 'No members found',
      guests: 'Guests',
      addGuest: 'Add guest',
      guestName: 'Guest name',
      selectedShooters: 'Selected shooters',
      startMatch: 'START MATCH',
      selectAtLeastOne: 'Select at least one shooter!',
      stage: 'STAGE',
      shooter: 'SHOOTER',
      timeSeconds: 'TIME (seconds)',
      penalties: 'PENALTIES',
      resetPenalties: 'Reset penalties',
      total: 'TOTAL',
      alreadyEntered: 'Already entered',
      enterValidTime: 'Enter a valid time!',
      newStage: '+ NEW STAGE',
      results: 'RESULTS',
      saveAsImage: '📷 SAVE AS IMAGE',
      finish: 'Finish',
      shooters: 'shooters',
      stages: 'stages',
      raw: 'Raw',
      pen: 'Pen',
      matchResultsTitle: 'Training Match Results',
      exportError: 'Export error',
      // Cancelled notification
      trainingCancelledNotif: 'Training cancelled',
      wasCancelled: 'was cancelled',
      // Refresh
      refresh: 'Refresh',
      refreshed: 'Refreshed',
      refreshing: 'Refreshing...',
      // Confirmations & Alerts
      deleteConfirm: 'Delete?',
      saved: 'Saved',
      deleted: 'Deleted',
      eventNotFound: 'Event not found',
      eventFull: 'Event is full',
      checkInput: 'Check your input',
      enterPassword: 'Enter password',
      importSuccess: 'Successfully imported',
      events: 'events',
      // Additional keys for forms
      type: 'Type',
      amount: 'Amount',
      leaderTrainer: 'Leader / Trainer',
      selectLeader: 'Select leader...',
      contactPlaceholder: 'Contact: +386 XX XXX XXX',
      full: 'FULL',
      signUpForEvent: 'Sign up for event',
      deadline: 'Deadline',
      whoWasPresent: 'Who was present?',
      noNews: 'No news',
      lastLogin: 'Last login',
      notificationTitle: 'Notification title',
      notificationContent: 'Notification content...',
      content: 'Content',
      buttonText: 'Button text',
      articleTitlePlaceholder: 'E.g.: Successful competition in Ljubljana',
      shortDescription: 'Short description of the article...',
      linkURL: 'Link (URL)',
      buttonTextOnButton: 'Button text',
      buttonTextPlaceholder: 'E.g.: Read article',
      preview: 'Preview',
      requiredColumns: 'Required columns',
      optionalColumns: 'Optional columns',
      uploadCSVFile: 'Upload CSV file',
      eventsReady: 'events ready',
      csvNeedsHeaderAndData: 'CSV must contain header and at least one row of data',
      noValidEventsInCSV: 'No valid events in CSV',
      import: 'Import',
      noNotifications: 'No notifications',
    }
  }[language];
  
  const chatContainerRef = useRef(null);
  const resultsRef = useRef(null);

  // Scroll chat to bottom when messages change or when entering chat view
  useEffect(() => {
    if (chatContainerRef.current && view === 'chat') {
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages, view]);

  // Splash screen - show for 2 seconds on first load
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Manual refresh function (called from refresh button)
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadPosts(), loadMembers(), loadPopups(), loadFeaturedArticle()]);
    showToast(t.refreshed || 'Osveženo', 'success');
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes logoExpand { 
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.5); opacity: 1; }
        100% { transform: scale(50); opacity: 0; }
      }
      @keyframes formFade {
        0% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(0.8); }
      }
      @keyframes pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(193, 55, 42, 0.4); }
        50% { box-shadow: 0 0 0 15px rgba(193, 55, 42, 0); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('vsk-remembered-email');
    if (rememberedEmail) setLoginEmail(rememberedEmail);
  }, []);

  useEffect(() => {
    if ('Notification' in window) setNotificationsEnabled(Notification.permission === 'granted');
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadUserProfile(session.user);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setView('home');
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        await loadUserProfile(session.user);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setView('home');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Helper function to load user profile from Supabase
  const loadUserProfile = async (user) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setUserRole(data.role || 'user');
        setView(data.role === 'admin' || data.role === 'superadmin' ? 'admin-dashboard' : 'news');

        // Track login
        try {
          if (!data.has_logged_in) {
            await supabase
              .from('members')
              .update({
                has_logged_in: true,
                first_login_at: new Date().toISOString(),
                last_login_at: new Date().toISOString()
              })
              .eq('user_id', user.id);
          } else {
            await supabase
              .from('members')
              .update({ last_login_at: new Date().toISOString() })
              .eq('user_id', user.id);
          }
        } catch (updateError) {
          // Login tracking failed but don't reset user role
        }
      } else {
        setUserRole('user');
        setView('news');
      }
      requestNotificationPermission().then(setNotificationsEnabled);
    } catch (e) {
      console.error('Error loading profile:', e);
      setUserRole('user');
      setView('news');
    }
    setLoading(false);
  };

  useEffect(() => { loadPosts(); }, []);

  // Listen for service worker updates - auto refresh when new version available
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'CACHE_UPDATED') {
          // New version available - reload to get latest
          window.location.reload();
        }
      });
      
      // Also check for waiting service worker and activate it
      navigator.serviceWorker.ready.then(registration => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version installed, will refresh on next load
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      });
    }
  }, []);

  // Check for cancelled trainings that user was signed up for
  useEffect(() => {
    if (!currentUser || !posts.length) return;
    
    // Get list of already seen cancelled trainings from localStorage
    const seenCancelled = JSON.parse(localStorage.getItem('vsk-seen-cancelled') || '[]');
    
    // Find cancelled trainings where user was signed up and hasn't been notified
    const cancelledForUser = posts.find(p => 
      p.cancelled && 
      p.cancelledNotifyEmails?.includes(currentUser.email) &&
      !seenCancelled.includes(p.id)
    );
    
    if (cancelledForUser) {
      setCancelledTrainingAlert(cancelledForUser);
    }
  }, [posts, currentUser]);

  const dismissCancelledAlert = (postId) => {
    const seenCancelled = JSON.parse(localStorage.getItem('vsk-seen-cancelled') || '[]');
    localStorage.setItem('vsk-seen-cancelled', JSON.stringify([...seenCancelled, postId]));
    setCancelledTrainingAlert(null);
  };

  // Auto-refresh when app becomes visible (comes back from background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUser) {
        loadPosts();
        loadMembers();
        loadPopups();
        loadFeaturedArticle();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentUser]);

  // Load all data when user logs in
  useEffect(() => {
    if (currentUser) {
      loadPosts();
      loadMembers();
      loadPopups();
      loadFeaturedArticle();
    }
  }, [currentUser]);

  // Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showToast(language === 'en' ? 'Back online!' : 'Spet povezan!', 'success');
    };
    const handleOffline = () => {
      setIsOffline(true);
      showToast(language === 'en' ? 'No internet connection' : 'Ni internetne povezave', 'error');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [language]);

  // Set calendar to today's date when switching to calendar view
  useEffect(() => {
    if (view === 'calendar' && selectedDate === null) {
      const today = new Date();
      if (today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear()) {
        setSelectedDate(today.getDate());
      }
    }
  }, [view]);

  useEffect(() => {
    if (currentUser) {
      loadProfileData();
      loadPopups();
      loadFeaturedArticle();
      loadMembers(); // Load members for all users (needed for role colors in chat)
    }
  }, [currentUser, userRole]);

  useEffect(() => {
    if (!currentUser) return;

    // Initial load of messages from last week
    const loadMessages = async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .gte('timestamp', weekAgo.toISOString())
        .order('timestamp', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    };

    loadMessages();

    // Real-time subscription for new messages
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser]);

  const loadProfileData = async () => {
    try {
      await withRetry(async () => {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('email', currentUser.email)
          .single();

        if (error) throw error;

        if (data) {
          setProfileData({
            ime: sanitizeInput(data.ime) || '',
            priimek: sanitizeInput(data.priimek) || '',
            email: data.email || currentUser.email,
            telefon: sanitizeInput(data.telefon) || '',
            morsStevilo: sanitizeInput(data.mors_stevilo) || '',
            orozneListine: Array.isArray(data.orozne_listine) ? data.orozne_listine : []
          });
        }
      });
    } catch (e) {
      // Failed to load profile - error silently ignored
    }
  };

  const loadPosts = async () => {
    try {
      await withRetry(async () => {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('date', { ascending: false })
          .range(0, POSTS_PER_PAGE);

        if (error) throw error;

        // Check if there are more posts
        setHasMorePosts(data.length === POSTS_PER_PAGE + 1);

        // Remove the extra document if it exists
        const posts = data.length === POSTS_PER_PAGE + 1 ? data.slice(0, POSTS_PER_PAGE) : data;
        setPosts(posts);

        // Store last document for pagination
        if (posts.length > 0) {
          setLastPostDoc(posts[posts.length - 1]);
        }
      });
    } catch (e) {
      // Failed to load posts - setting empty array
      setPosts([]);
      setHasMorePosts(false);
    }
  };

  const loadMorePosts = async () => {
    if (!lastPostDoc) return;
    try {
      await withRetry(async () => {
        const currentCount = posts.length;
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('date', { ascending: false })
          .range(currentCount, currentCount + POSTS_PER_PAGE);

        if (error) throw error;

        // Check if there are more posts
        const hasMore = data.length === POSTS_PER_PAGE + 1;
        setHasMorePosts(hasMore);

        // Remove the extra document if it exists
        const newPosts = hasMore ? data.slice(0, POSTS_PER_PAGE) : data;
        setPosts(prev => [...prev, ...newPosts]);

        // Store last document for next pagination
        if (newPosts.length > 0) {
          setLastPostDoc(newPosts[newPosts.length - 1]);
        }
      });
    } catch (e) {
      // Failed to load more posts
      setHasMorePosts(false);
    }
  };

  const loadMembers = async () => {
    try {
      await withRetry(async () => {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .range(0, MEMBERS_PER_PAGE);

        if (error) throw error;

        // Check if there are more members
        setHasMoreMembers(data.length === MEMBERS_PER_PAGE + 1);

        // Remove the extra document if it exists
        const members = data.length === MEMBERS_PER_PAGE + 1 ? data.slice(0, MEMBERS_PER_PAGE) : data;

        // Convert snake_case to camelCase for UI
        const membersFormatted = members.map(m => ({
          ...m,
          morsStevilo: m.mors_stevilo,
          membershipPaid: m.membership_paid,
          orozneListine: m.orozne_listine,
          hasLoggedIn: m.has_logged_in,
          firstLoginAt: m.first_login_at,
          lastLoginAt: m.last_login_at,
          createdAt: m.created_at,
          createdBy: m.created_by,
          userId: m.user_id
        }));

        setMembers(membersFormatted);
      });
    } catch (e) {
      // Failed to load members - setting empty array
      setMembers([]);
      setHasMoreMembers(false);
    }
  };

  const loadMoreMembers = async () => {
    try {
      await withRetry(async () => {
        const currentCount = members.length;
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .range(currentCount, currentCount + MEMBERS_PER_PAGE);

        if (error) throw error;

        // Check if there are more members
        setHasMoreMembers(data.length === MEMBERS_PER_PAGE + 1);

        // Remove the extra document if it exists
        const newMembers = data.length === MEMBERS_PER_PAGE + 1 ? data.slice(0, MEMBERS_PER_PAGE) : data;

        // Convert snake_case to camelCase for UI
        const membersFormatted = newMembers.map(m => ({
          ...m,
          morsStevilo: m.mors_stevilo,
          membershipPaid: m.membership_paid,
          orozneListine: m.orozne_listine,
          hasLoggedIn: m.has_logged_in,
          firstLoginAt: m.first_login_at,
          lastLoginAt: m.last_login_at,
          createdAt: m.created_at,
          createdBy: m.created_by,
          userId: m.user_id
        }));

        setMembers(prev => [...prev, ...membersFormatted]);
      });
    } catch (e) {
      // Failed to load more members
      setHasMoreMembers(false);
    }
  };

  const loadPopups = async () => {
    try {
      await withRetry(async () => {
        const { data, error } = await supabase
          .from('popups')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Convert snake_case from database to camelCase for app
        const formattedData = data?.map(p => ({
          id: p.id,
          title: p.title,
          description: p.description,
          deadline: p.deadline,
          buttonText: p.button_text,
          buttonURL: p.button_url,
          active: p.active,
          showDeadline: p.show_deadline,
          showButton: p.show_button,
          created_at: p.created_at
        })) || [];

        setPopups(formattedData);
        // Show active popup to user
        const active = formattedData?.find(p => p.active && !dismissedPopups.includes(p.id));
        if (active) setActivePopup(active);
      });
    } catch (e) {
      // Failed to load popups - setting empty array
      setPopups([]);
    }
  };

  const loadFeaturedArticle = async () => {
    try {
      await withRetry(async () => {
        const { data, error } = await supabase
          .from('settings')
          .select('featured_article')
          .eq('id', 'singleton')
          .single();

        if (error) throw error;

        if (data && data.featured_article) {
          setFeaturedArticle(data.featured_article);
        } else {
          setFeaturedArticle(null);
        }
      });
    } catch (e) {
      // Failed to load featured article - setting null
      setFeaturedArticle(null);
    }
  };

  const saveFeaturedArticle = async (article) => {
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          featured_article: article,
          updated_at: new Date().toISOString()
        })
        .eq('id', 'singleton');

      if (error) throw error;
      setEditingFeatured(null);
      loadFeaturedArticle();
      showToast(t.saved || 'Shranjeno!', 'success');
    } catch (e) { showToast((t.error || 'Napaka') + ': ' + e.message, 'error'); }
  };

  const handleSavePopup = async (popup) => {
    try {
      // Convert camelCase to snake_case for database
      const dbPopup = {
        title: popup.title,
        description: popup.description,
        deadline: popup.deadline,
        button_text: popup.buttonText,
        button_url: popup.buttonURL,
        active: popup.active,
        show_deadline: popup.showDeadline,
        show_button: popup.showButton
      };

      if (popup.id) {
        const { error } = await supabase
          .from('popups')
          .update(dbPopup)
          .eq('id', popup.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('popups')
          .insert({ ...dbPopup, created_at: new Date().toISOString() });

        if (error) throw error;
      }
      setEditingPopup(null);
      loadPopups();
      showToast(t.saved || 'Shranjeno!', 'success');
    } catch (e) { showToast((t.error || 'Napaka') + ': ' + e.message, 'error'); }
  };

  const handleDeletePopup = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      const { error } = await supabase
        .from('popups')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadPopups();
      showToast(t.deleted || 'Izbrisano', 'success');
    } catch (e) { showToast(t.error || 'Napaka', 'error'); }
  };

  const dismissPopup = (popupId) => {
    setDismissedPopups([...dismissedPopups, popupId]);
    setActivePopup(null);
  };

  const handleLogin = async (email, password) => {
    if (isLoading) return;
    // Validate inputs
    if (!email || !validateEmail(email)) {
      showToast(t.enterEmail || 'Vnesite veljaven email', 'error');
      return;
    }
    if (!password || password.length < 6) {
      showToast(t.enterPassword || 'Vnesite geslo', 'error');
      return;
    }
    setIsLoading(true);
    try {
      setLoginAnimation(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      localStorage.setItem('vsk-remembered-email', email);
      // Animation will play, then auth state change will handle the rest
    } catch (e) {
      setLoginAnimation(false);
      // Better error messages
      const errorMsg = e.message.includes('Invalid login credentials') ? (language === 'en' ? 'Invalid email or password' : 'Napačen email ali geslo') :
                       e.message.includes('too many') ? (language === 'en' ? 'Too many attempts. Try again later.' : 'Preveč poskusov. Poskusite kasneje.') :
                       e.message.includes('network') ? (language === 'en' ? 'Network error. Check your connection.' : 'Napaka omrežja. Preverite povezavo.') :
                       (t.error || 'Napaka') + ': ' + e.message;
      showToast(errorMsg, 'error');
    }
    finally { setIsLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail) { showToast(t.enterEmail, 'error'); return; }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail);
      if (error) throw error;
      showToast(t.emailSent, 'success');
    } catch (e) { showToast(t.error + ': ' + e.message, 'error'); }
  };

  const handleLogout = async () => { try { await supabase.auth.signOut(); } catch (e) {} };

  const handleSavePost = async (post) => {
    try {
      if (post.id) {
        // Update existing post
        const { error } = await supabase
          .from('posts')
          .update({
            type: post.type,
            title: post.title,
            description: post.description,
            date: post.date,
            time: post.time,
            location: post.location,
            link: post.link,
            max_participants: post.maxParticipants,
            trener: post.trener,
            show_in_news: post.showInNews,
            is_featured: post.isFeatured,
            rsvps: post.rsvps || [],
            completed: post.completed,
            cancelled: post.cancelled
          })
          .eq('id', post.id);

        if (error) throw error;
      } else {
        // Create new post
        const { error } = await supabase
          .from('posts')
          .insert({
            type: post.type,
            title: post.title,
            description: post.description,
            date: post.date,
            time: post.time || '23:59',
            location: post.location,
            link: post.link,
            max_participants: post.maxParticipants,
            trener: post.trener,
            show_in_news: post.showInNews !== false,
            is_featured: post.isFeatured || false,
            rsvps: [],
            author: currentUser.email,
            author_id: currentUser.id,
            timestamp: new Date().toISOString()
          });

        if (error) throw error;
        if (post.showInNews) sendNotification('Nov dogodek: ' + post.title, post.description?.substring(0, 100) || '');
      }
      setEditingPost(null);
      loadPosts();
      showToast(t.saved || 'Shranjeno!', 'success');
    } catch (e) { showToast((t.error || 'Napaka') + ': ' + e.message, 'error'); }
  };

  const handleCSVImport = async (events) => {
    try {
      let successCount = 0;
      for (const event of events) {
        const { error } = await supabase
          .from('posts')
          .insert({
            ...event,
            timestamp: new Date().toISOString(),
            author: currentUser.email,
            author_id: currentUser.id,
            rsvps: []
          });

        if (error) throw error;
        successCount++;
      }
      setShowCSVImport(false);
      loadPosts();
      showToast(`${t.importSuccess || 'Uspešno uvoženih'} ${successCount} ${t.events || 'dogodkov'}!`, 'success');
    } catch (e) { showToast((t.importError || 'Napaka pri uvozu') + ': ' + e.message, 'error'); }
  };

  const handleDeletePost = async (id) => {
    if (window.confirm(t.deleteConfirm)) {
      try {
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', id);

        if (error) throw error;
        loadPosts();
        showToast(t.deleted || 'Izbrisano', 'success');
      } catch (e) {
        showToast(t.error || 'Napaka', 'error');
      }
    }
  };

  const changeRole = async (id, role) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ role })
        .eq('id', id);

      if (error) throw error;
      loadMembers();
      showToast(t.saved || 'Shranjeno', 'success');
    } catch (e) {
      showToast(t.error || 'Napaka', 'error');
    }
  };

  const toggleMembershipStatus = async (id) => {
    const m = members.find(x => x.id === id);
    if (!m) {
      showToast('Član ni najden', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('members')
        .update({ membership_paid: !m.membershipPaid })
        .eq('id', id);

      if (error) throw error;
      loadMembers();
      showToast(m.membershipPaid ? 'Označeno kot neplačano' : 'Označeno kot plačano', 'success');
    } catch (e) {
      console.error('Toggle membership error:', e);
      showToast('Napaka: ' + e.message, 'error');
    }
  };

  const handleCreateMember = async (memberData) => {
    if (!memberData.email || !memberData.ime || !memberData.priimek) {
      showToast('Email, ime in priimek so obvezni', 'error');
      return;
    }

    if (!memberData.password || memberData.password.length < 6) {
      showToast('Geslo mora biti dolgo vsaj 6 znakov', 'error');
      return;
    }

    try {
      // Call the Supabase Edge Function to create the member
      // This runs server-side, so it won't log you out!
      const { data: session } = await supabase.auth.getSession();

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token}`
        },
        body: JSON.stringify({
          email: memberData.email,
          password: memberData.password,
          ime: memberData.ime,
          priimek: memberData.priimek,
          telefon: memberData.telefon || '',
          morsStevilo: memberData.morsStevilo || '',
          role: memberData.role || 'user'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create member');
      }

      showToast(`Član ${memberData.ime} ${memberData.priimek} ustvarjen!`, 'success');

      // Reset form and reload members
      setNewMemberData({ email: '', ime: '', priimek: '', telefon: '', morsStevilo: '', role: 'user', password: '' });
      setShowNewMemberForm(false);

      // Reload members list to show the new member
      loadMembers();

    } catch (error) {
      console.error('Error creating member:', error);

      if (error.message.includes('already exists')) {
        showToast(`Email ${memberData.email} že obstaja`, 'error');
      } else if (error.message.includes('Permission denied')) {
        showToast('Nimate dovoljenja za ustvarjanje članov (samo superadmin)', 'error');
      } else {
        showToast('Napaka pri ustvarjanju člana: ' + error.message, 'error');
      }
    }
  };

  // Export backup of all data to JSON file
  const handleExportBackup = async () => {
    try {
      showToast('Pripravljam varnostno kopijo...', 'info');

      // Fetch all data from Supabase
      const [postsResult, membersResult, messagesResult, settingsResult] = await Promise.all([
        supabase.from('posts').select('*'),
        supabase.from('members').select('*'),
        supabase.from('messages').select('*'),
        supabase.from('settings').select('*')
      ]);

      const backup = {
        exportDate: new Date().toISOString(),
        exportBy: currentUser.email,
        version: '2.0',
        database: 'supabase',
        data: {
          posts: postsResult.data || [],
          members: membersResult.data || [],
          messages: messagesResult.data || [],
          settings: settingsResult.data || []
        },
        stats: {
          postsCount: postsResult.data?.length || 0,
          membersCount: membersResult.data?.length || 0,
          messagesCount: messagesResult.data?.length || 0
        }
      };

      // Create downloadable file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vsk-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Varnostna kopija prenesena!', 'success');
    } catch (error) {
      showToast('Napaka pri izvozu: ' + error.message, 'error');
    }
  };

  const saveProfileData = async () => {
    try {
      const { error } = await supabase
        .from('members')
        .update({
          ime: profileData.ime,
          priimek: profileData.priimek,
          telefon: profileData.telefon,
          mors_stevilo: profileData.morsStevilo,
          orozne_listine: profileData.orozneListine
        })
        .eq('user_id', currentUser.id);

      if (error) throw error;
      setEditingProfile(false);
      showToast(t.saved || 'Shranjeno', 'success');
    } catch (e) { showToast(t.error || 'Napaka', 'error'); }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || passwordForm.newPassword.length < 7 || passwordForm.newPassword !== passwordForm.confirmPassword) { showToast(t.checkInput || 'Preverite vnos', 'error'); return; }
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      if (error) throw error;
      showToast(t.passwordChanged, 'success');
      setShowPasswordForm(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) { showToast((t.error || 'Napaka') + ': ' + e.message, 'error'); }
  };

  const addOroznaListina = () => setProfileData({ ...profileData, orozneListine: [...profileData.orozneListine, { vrsta: '', stevilo: '' }] });
  const updateOroznaListina = (i, f, v) => setProfileData({ ...profileData, orozneListine: profileData.orozneListine.map((x, j) => j === i ? { ...x, [f]: v } : x) });
  const removeOroznaListina = (i) => setProfileData({ ...profileData, orozneListine: profileData.orozneListine.filter((_, j) => j !== i) });

  const getInitials = () => ((profileData.ime || currentUser.email.charAt(0)).charAt(0) + (profileData.priimek || '').charAt(0)).toUpperCase();

  const handleRSVP = async (eventId) => {
    try {
      const { data: postData, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', eventId)
        .single();

      if (fetchError || !postData) {
        showToast(t.eventNotFound || 'Dogodek ne obstaja', 'error');
        return;
      }

      const rsvps = postData.rsvps || [];
      if (rsvps.some(r => r.userId === currentUser.id)) {
        showToast(t.alreadySignedUp, 'error');
        return;
      }
      if (postData.max_participants && rsvps.length >= parseInt(postData.max_participants)) {
        showToast(t.eventFull || 'Dogodek je poln', 'error');
        return;
      }

      const newRsvp = {
        userId: currentUser.id,
        email: currentUser.email,
        name: profileData.ime && profileData.priimek ? `${profileData.ime} ${profileData.priimek}` : currentUser.email,
        timestamp: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('posts')
        .update({ rsvps: [...rsvps, newRsvp] })
        .eq('id', eventId);

      if (updateError) throw updateError;

      loadPosts();
      // Update selected event if open
      if (selectedEvent?.id === eventId) {
        setSelectedEvent({ ...selectedEvent, rsvps: [...rsvps, newRsvp] });
      }
      showToast(t.signupSuccess, 'success');
    } catch (e) { showToast((t.error || 'Napaka') + ': ' + e.message, 'error'); }
  };

  const cancelRSVP = async (eventId) => {
    try {
      const { data: postData, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', eventId)
        .single();

      if (fetchError || !postData) return;

      const rsvps = postData.rsvps || [];
      const updatedRsvps = rsvps.filter(r => r.userId !== currentUser.id);

      const { error: updateError } = await supabase
        .from('posts')
        .update({ rsvps: updatedRsvps })
        .eq('id', eventId);

      if (updateError) throw updateError;

      loadPosts();
      if (selectedEvent?.id === eventId) {
        setSelectedEvent({ ...selectedEvent, rsvps: updatedRsvps });
      }
      showToast(t.signupCancelled, 'success');
    } catch (e) { showToast((t.error || 'Napaka') + ': ' + e.message, 'error'); }
  };

  const handleCompleteTraining = async (eventId, attendance, notes) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          completed_by: currentUser.email,
          attendance: attendance,
          trainer_notes: notes
        })
        .eq('id', eventId);

      if (error) throw error;
      loadPosts();
      showToast(t.trainingCompleted, 'success');
    } catch (e) { showToast((t.error || 'Napaka') + ': ' + e.message, 'error'); }
  };

  const handleCancelTraining = async (eventId) => {
    if (!window.confirm(t.confirmCancel)) return;
    try {
      // Get the event to find RSVPs
      const event = posts.find(p => p.id === eventId);
      const rsvpEmails = event?.rsvps?.map(r => r.email) || [];

      const { error } = await supabase
        .from('posts')
        .update({
          cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancelled_by: currentUser.email,
          cancelled_notify_emails: rsvpEmails // Store who needs to be notified
        })
        .eq('id', eventId);

      if (error) throw error;
      loadPosts();
      setSelectedEvent(null);
      showToast(t.trainingCancelled, 'success');
    } catch (e) { showToast((t.error || 'Napaka') + ': ' + e.message, 'error'); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;
    const messageText = sanitizeInput(newMessage);
    if (!messageText) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          text: messageText,
          author_id: currentUser.id,
          author: currentUser.email,
          author_name: profileData.ime && profileData.priimek ? `${profileData.ime} ${profileData.priimek}` : currentUser.email,
          timestamp: new Date().toISOString()
        });

      if (error) throw error;
      setNewMessage('');
      setShowMentions(false);
    } catch (e) { showToast(t.error || 'Napaka', 'error'); }
    finally { setIsLoading(false); }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm(t.deleteMessage)) return;
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      showToast(t.deleted || 'Izbrisano', 'success');
    } catch (e) { showToast((t.error || 'Napaka') + ': ' + e.message, 'error'); }
  };

  const handleMessageInput = (v) => {
    setNewMessage(v);
    const at = v.lastIndexOf('@');
    if (at !== -1 && (at === v.length - 1 || v.substring(at + 1).indexOf(' ') === -1)) {
      const term = v.substring(at + 1).toLowerCase();
      const sugg = members.filter(m => `${m.ime || ''} ${m.priimek || ''}`.toLowerCase().includes(term)).map(m => `${m.ime || ''} ${m.priimek || ''}`.trim()).filter(Boolean);
      setMentionSuggestions(sugg);
      setShowMentions(sugg.length > 0);
    } else setShowMentions(false);
  };

  const insertMention = (name) => { setNewMessage(newMessage.substring(0, newMessage.lastIndexOf('@')) + '@' + name + ' '); setShowMentions(false); };
  const renderMessageWithMentions = (text) => text.split(/(@\w+\s+\w+)/g).map((p, i) => p.startsWith('@') ? <span key={i} style={{ color: '#60a5fa', fontWeight: '600' }}>{p}</span> : p);

  const getDaysInMonth = (d) => ({ daysInMonth: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), startingDayOfWeek: new Date(d.getFullYear(), d.getMonth(), 1).getDay() });
  const getEventsForDate = (day) => posts.filter(p => p.date === `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);

  const renderCalendarDay = (day) => {
    const events = getEventsForDate(day);
    const isSelected = selectedDate === day;
    const today = new Date();
    const isToday = today.getFullYear() === currentMonth.getFullYear() && today.getMonth() === currentMonth.getMonth() && today.getDate() === day;
    const hasCompleted = events.some(e => e.completed);
    const hasCancelled = events.some(e => e.cancelled);
    const activeEvents = events.filter(e => !e.cancelled);
    
    // Background: event color if has events, otherwise dark gray
    const bg = activeEvents.length === 0 
      ? '#252830' 
      : activeEvents.length === 1 
        ? (EVENT_COLORS[activeEvents[0].type]?.calendarColor || '#888') 
        : `linear-gradient(135deg, ${activeEvents.map(e => EVENT_COLORS[e.type]?.calendarColor || '#888').join(', ')})`;
    
    // White outline for selected OR today
    const showWhiteOutline = isSelected || isToday;
    
    return (
      <div key={day} onClick={() => setSelectedDate(day)} style={{
        aspectRatio: '1', 
        background: bg, 
        borderRadius: '8px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        cursor: 'pointer', 
        border: showWhiteOutline ? '2px solid #fff' : '1px solid #3b3d41', 
        boxShadow: showWhiteOutline ? '0 0 10px rgba(255,255,255,0.4)' : 'none',
        position: 'relative', 
        opacity: hasCancelled && activeEvents.length === 0 ? 0.5 : 1,
        transition: 'all 0.15s ease'
      }}>
        <span style={{ 
          fontSize: '14px', 
          fontWeight: showWhiteOutline ? '700' : '600', 
          color: '#fff', 
          textShadow: activeEvents.length > 0 ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none' 
        }}>{day}</span>
        {hasCompleted && (
          <div style={{
            position: 'absolute', bottom: '2px', right: '2px',
            width: '12px', height: '12px', borderRadius: '50%',
            background: '#10b981', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '8px', color: '#fff', fontWeight: '700'
          }}>✓</div>
        )}
      </div>
    );
  };

  // Splash screen on app launch
  if (showSplash) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0b0c',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        <img 
          src="https://vsk.si/wp-content/uploads/2023/01/VSK.png" 
          alt="VSK" 
          style={{ 
            height: '80px',
            animation: 'pulse 2s ease-in-out infinite'
          }}
        />
      </div>
    );
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0b0c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #c1372a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  // Login screen with animation
  if (!currentUser) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #0a0b0c 70%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Animated background smoke effect */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(circle at 30% 20%, rgba(193, 55, 42, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(193, 55, 42, 0.08) 0%, transparent 40%)',
          pointerEvents: 'none'
        }} />
        
        {/* Logo that expands on login - only visible during animation */}
        {loginAnimation && (
          <img 
            src="https://vsk.si/wp-content/uploads/2023/01/VSK.png" 
            alt="VSK" 
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              height: '80px',
              animation: 'logoExpand 0.8s ease-in forwards',
              zIndex: 1000
            }}
          />
        )}

        {/* Login form */}
        <div style={{
          width: '100%',
          maxWidth: '380px',
          ...glassStyle,
          borderRadius: '24px',
          padding: '40px 32px',
          animation: loginAnimation ? 'formFade 0.5s ease-out forwards' : 'fadeIn 0.5s ease-out',
          opacity: loginAnimation ? 0 : 1,
          pointerEvents: loginAnimation ? 'none' : 'auto'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img 
              src="https://vsk.si/wp-content/uploads/2023/01/VSK.png" 
              alt="VSK" 
              style={{ height: '70px', marginBottom: '20px' }}
            />
            <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>{t.welcome}</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{t.clubName}</p>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            <input 
              type="email" 
              value={loginEmail} 
              onChange={(e) => setLoginEmail(e.target.value)} 
              placeholder={t.email} 
              style={{
                width: '100%',
                padding: '16px 18px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '16px',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
            <input 
              type="password" 
              value={loginPassword} 
              onChange={(e) => setLoginPassword(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && handleLogin(loginEmail, loginPassword)}
              placeholder={t.password} 
              style={{
                width: '100%',
                padding: '16px 18px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '16px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          <button 
            onClick={() => handleLogin(loginEmail, loginPassword)} 
            disabled={isLoading || !loginEmail || !loginPassword}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #c1372a 0%, #9a2c22 100%)',
              color: '#fff',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 20px rgba(193, 55, 42, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
          >
            {isLoading ? (
              <>
                <div style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                {t.loading}
              </>
            ) : t.login}
          </button>

          <button 
            onClick={handleForgotPassword} 
            style={{
              width: '100%',
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              padding: '12px',
              border: 'none',
              fontSize: '13px',
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            {t.forgotPassword}
          </button>
        </div>
      </div>
    );
  }

  const tabs = (userRole === 'admin' || userRole === 'superadmin') 
    ? [{ key: 'admin-dashboard', label: t.admin, icon: BarChart3 }, { key: 'news', label: t.news, icon: FileText }, { key: 'calendar', label: t.calendar, icon: Calendar }, { key: 'chat', label: t.chat, icon: Users }, { key: 'profile', label: t.profile, icon: User }]
    : [{ key: 'news', label: t.news, icon: FileText }, { key: 'calendar', label: t.calendar, icon: Calendar }, { key: 'chat', label: t.chat, icon: Users }, { key: 'profile', label: t.profile, icon: User }];

  const newsPosts = posts.filter(p =>
    p.showInNews === true &&
    (p.type === 'announcement' || p.type === 'payment')
  );

  return (
    <div 
      style={{ 
        position: 'relative',
        height: '100dvh',
        width: '100%',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at top, #141618 0%, #0a0b0c 100%)' 
      }}
    >
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 'calc(20px + env(safe-area-inset-top, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{
            background: toast.type === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                        toast.type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                        'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            padding: '14px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            maxWidth: '90vw'
          }}>
            {toast.type === 'success' && <Check size={18} />}
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.message}
          </div>
        </div>
      )}

      {/* Offline Banner */}
      {isOffline && (
        <div style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px))',
          left: 0,
          right: 0,
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: '#000',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: '600',
          textAlign: 'center',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          {language === 'en' ? 'Offline - Some features may not work' : 'Brez povezave - Nekatere funkcije morda ne bodo delovale'}
        </div>
      )}

      {editingPost && <PostForm post={editingPost} onSave={handleSavePost} onCancel={() => setEditingPost(null)} members={members} t={t} />}
      {editingPopup && <PopupForm popup={editingPopup} onSave={handleSavePopup} onCancel={() => setEditingPopup(null)} t={t} />}
      {activePopup && <PopupModal popup={activePopup} onDismiss={() => dismissPopup(activePopup.id)} />}
      
      {/* Cancelled Training Alert */}
      {cancelledTrainingAlert && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: '20px'
        }}>
          <div style={{
            background: '#1c1f22',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '340px',
            width: '100%',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '28px'
            }}>
              ⚠️
            </div>
            <h2 style={{ color: '#ef4444', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
              {t.trainingCancelledNotif}
            </h2>
            <p style={{ color: '#fff', fontSize: '16px', marginBottom: '4px', fontWeight: '600' }}>
              {cancelledTrainingAlert.title}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '20px' }}>
              {cancelledTrainingAlert.date && new Date(cancelledTrainingAlert.date).toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' })} {t.wasCancelled}
            </p>
            <button
              onClick={() => dismissCancelledAlert(cancelledTrainingAlert.id)}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {t.confirm}
            </button>
          </div>
        </div>
      )}
      
      {showCSVImport && <CSVImportModal onClose={() => setShowCSVImport(false)} onImport={handleCSVImport} t={t} />}
      {selectedEvent && <EventDetailModal post={selectedEvent} onClose={() => setSelectedEvent(null)} currentUser={currentUser} onRSVP={handleRSVP} onCancelRSVP={cancelRSVP} profileData={profileData} userRole={userRole} onCompleteTraining={handleCompleteTraining} onCancelTraining={handleCancelTraining} t={t} language={language} />}

      {view === 'admin-dashboard' && (userRole === 'admin' || userRole === 'superadmin') && (
        <div className="page-scroll">
          <div style={pageContentPadding}>
          {userRole === 'superadmin' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ ...glassCardStyle }}><div style={{ fontSize: '26px', fontWeight: '700', color: '#fff' }}>{members.length}</div><div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{t.membersCount}</div></div>
              <div style={{ ...glassCardStyle }}><div style={{ fontSize: '26px', fontWeight: '700', color: '#10b981' }}>{members.filter(m => m.membershipPaid).length}/{members.length}</div><div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{t.membershipStatus}</div></div>
            </div>
          )}
          <div style={{ display: 'grid', gap: '12px' }}>
            <div onClick={() => setView('admin-posts')} style={{ ...glassCardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #c1372a 0%, #9a2c22 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(193, 55, 42, 0.3)' }}><FileText size={22} color="#fff" /></div>
                <div><h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>{t.postsEvents}</h3><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{t.createEditDelete}</p></div>
              </div>
              <ChevronRight size={22} color="rgba(255,255,255,0.3)" />
            </div>
            <div onClick={() => setView('admin-stats')} style={{ ...glassCardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)' }}><BarChart3 size={22} color="#fff" /></div>
                <div><h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>{t.trainingStats}</h3><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{t.attendanceAbsenceNotes}</p></div>
              </div>
              <ChevronRight size={22} color="rgba(255,255,255,0.3)" />
            </div>
            <div onClick={() => { setMatchPhase('setup'); setMatchShooters([]); setMatchGuests([]); setMatchRuns([]); setMatchCurrentStage(1); setView('training-match'); }} style={{ ...glassCardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}><Timer size={22} color="#fff" /></div>
                <div><h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>{t.trainingMatch}</h3><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{t.resultsExport}</p></div>
              </div>
              <ChevronRight size={22} color="rgba(255,255,255,0.3)" />
            </div>
            {userRole === 'superadmin' && (
              <>
                <div onClick={() => setView('admin-popups')} style={{ ...glassCardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)' }}><AlertCircle size={22} color="#fff" /></div>
                    <div><h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>{t.popupNotifications}</h3><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{t.specialNotifications}</p></div>
                  </div>
                  <ChevronRight size={22} color="rgba(255,255,255,0.3)" />
                </div>
                <div onClick={() => setView('admin-featured')} style={{ ...glassCardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(234, 179, 8, 0.3)' }}><ExternalLink size={22} color="#fff" /></div>
                    <div><h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>{t.featuredArticle}</h3><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{t.promoteArticle}</p></div>
                  </div>
                  <ChevronRight size={22} color="rgba(255,255,255,0.3)" />
                </div>
                <div onClick={() => setShowCSVImport(true)} style={{ ...glassCardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}><Upload size={22} color="#fff" /></div>
                    <div><h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>{t.importCSV}</h3><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{t.bulkImport}</p></div>
                  </div>
                  <ChevronRight size={22} color="rgba(255,255,255,0.3)" />
                </div>
                <div onClick={() => setShowNewMemberForm(true)} style={{ ...glassCardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)' }}><UserPlus size={22} color="#fff" /></div>
                    <div><h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>Dodaj člana</h3><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Ustvari nov uporabniški račun</p></div>
                  </div>
                  <ChevronRight size={22} color="rgba(255,255,255,0.3)" />
                </div>
                <div onClick={() => setView('admin-members')} style={{ ...glassCardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}><Users size={22} color="#fff" /></div>
                    <div><h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>{t.members}</h3><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{t.rolesMembership}</p></div>
                  </div>
                  <ChevronRight size={22} color="rgba(255,255,255,0.3)" />
                </div>
                <div onClick={handleExportBackup} style={{ ...glassCardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)' }}><Download size={22} color="#fff" /></div>
                    <div><h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>Izvozi varnostno kopijo</h3><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Prenesi vse podatke (JSON)</p></div>
                  </div>
                  <ChevronRight size={22} color="rgba(255,255,255,0.3)" />
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      )}

      {view === 'admin-posts' && (userRole === 'admin' || userRole === 'superadmin') && (
        <div className="page-scroll">
          <div style={pageContentPadding}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#fff' }}>Objave</h1>
            <button onClick={() => setEditingPost({})} style={{ background: 'linear-gradient(135deg, #c1372a 0%, #9a2c22 100%)', color: '#fff', padding: '10px 18px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 15px rgba(193, 55, 42, 0.3)' }}><Plus size={16} />Nova</button>
          </div>
          {posts.map(post => {
            const formatDate = (dateStr) => {
              if (!dateStr) return '';
              const parts = dateStr.split('-');
              return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
            };
            const showTitle = post.type === 'announcement' || post.type === 'payment';
            return (
              <div key={post.id} style={{ ...glassCardStyle, padding: '12px 16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                  <span style={{ 
                    background: `linear-gradient(135deg, ${EVENT_COLORS[post.type]?.bg || '#888'} 0%, ${EVENT_COLORS[post.type]?.bg || '#888'}cc 100%)`, 
                    color: '#fff', 
                    padding: '6px 12px', 
                    borderRadius: '8px', 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    minWidth: '75px',
                    textAlign: 'center'
                  }}>
                    {post.type === 'training' ? t.training : post.type === 'competition' ? t.match : post.type === 'announcement' ? t.announcement : post.type === 'payment' ? t.payment : 'Event'}
                  </span>
                  {showTitle && (
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>{post.title}</span>
                  )}
                  {!showTitle && post.date && (
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>
                      {formatDate(post.date)}
                    </span>
                  )}
                  {!showTitle && post.time && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{post.time}</span>}
                  {showTitle && (post.date || post.time) && (
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                      {formatDate(post.date)}{post.time ? ` • ${post.time}` : ''}
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                    {post.showInNews && <span style={{ fontSize: '12px' }}>📰</span>}
                    {post.linkURL && <Link size={14} color="#3b82f6" />}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button onClick={() => setEditingPost(post)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={14} /></button>
                  <button onClick={() => handleDeletePost(post.id)} style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}

          {/* Load More Posts Button */}
          {hasMorePosts && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={loadMorePosts}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                Naloži več ({POSTS_PER_PAGE} objav)
              </button>
            </div>
          )}
          </div>
        </div>
      )}

      {view === 'admin-popups' && userRole === 'superadmin' && (
        <div className="page-scroll">
          <div style={pageContentPadding}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#fff' }}>Popup obvestila</h1>
            <button onClick={() => setEditingPopup({})} style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', padding: '10px 18px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)' }}><Plus size={16} />Novo</button>
          </div>
          {popups.length === 0 ? (
            <div style={{ ...glassCardStyle, textAlign: 'center', padding: '40px 20px' }}>
              <AlertCircle size={40} color="rgba(255,255,255,0.2)" style={{ marginBottom: '12px' }} />
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Ni obvestil</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '4px' }}>Ustvari novo popup obvestilo</p>
            </div>
          ) : popups.map(popup => (
            <div key={popup.id} style={{ ...glassCardStyle, padding: '14px 16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={{ 
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: popup.active ? '#10b981' : 'rgba(255,255,255,0.3)',
                  boxShadow: popup.active ? '0 0 8px #10b981' : 'none'
                }} />
                <div>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>{popup.title}</span>
                  {popup.showDeadline && popup.deadline && (
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginLeft: '10px' }}>
                      Rok: {popup.deadline.split('-').reverse().join('.')}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => setEditingPopup(popup)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={14} /></button>
                <button onClick={() => handleDeletePopup(popup.id)} style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {view === 'admin-featured' && userRole === 'superadmin' && (
        <div className="page-scroll">
          <div style={pageContentPadding}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>Izpostavljen članek</h1>
          
          <div style={{ ...glassCardStyle, marginBottom: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Naslov</label>
              <input
                type="text"
                value={featuredArticle?.title || ''}
                onChange={(e) => setFeaturedArticle({ ...featuredArticle, title: e.target.value })}
                placeholder="Npr: Uspešno tekmovanje v Ljubljani"
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Opis</label>
              <textarea
                value={featuredArticle?.description || ''}
                onChange={(e) => setFeaturedArticle({ ...featuredArticle, description: e.target.value })}
                placeholder="Kratek opis članka..."
                rows={3}
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Povezava (URL)</label>
              <input
                type="url"
                value={featuredArticle?.linkURL || ''}
                onChange={(e) => setFeaturedArticle({ ...featuredArticle, linkURL: e.target.value })}
                placeholder="https://..."
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Besedilo na gumbu</label>
              <input
                type="text"
                value={featuredArticle?.buttonText || ''}
                onChange={(e) => setFeaturedArticle({ ...featuredArticle, buttonText: e.target.value })}
                placeholder="Npr: Preberi članek"
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '16px' }}>
              <input
                type="checkbox"
                checked={featuredArticle?.active || false}
                onChange={(e) => setFeaturedArticle({ ...featuredArticle, active: e.target.checked })}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <label style={{ color: '#fff', fontSize: '14px' }}>Prikaži na strani Novice</label>
            </div>
            
            <button 
              onClick={() => saveFeaturedArticle(featuredArticle || {})}
              style={{ 
                width: '100%', padding: '14px', 
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', 
                color: '#000', border: 'none', borderRadius: '10px', 
                fontSize: '15px', fontWeight: '700', cursor: 'pointer' 
              }}
            >
              Shrani
            </button>
          </div>
          
          {/* Preview */}
          {featuredArticle?.title && (
            <div>
              <h3 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Predogled</h3>
              <div style={{
                background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(202, 138, 4, 0.1) 100%)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '16px',
                padding: '20px',
                position: 'relative',
                overflow: 'hidden',
                opacity: featuredArticle.active ? 1 : 0.5
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                  background: 'linear-gradient(90deg, #eab308, #ca8a04, #eab308)'
                }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Trophy size={20} color="#fff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: '#eab308', fontSize: '17px', fontWeight: '700', marginBottom: '6px' }}>
                      {featuredArticle.title || 'Naslov'}
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.5' }}>
                      {featuredArticle.description || 'Opis članka...'}
                    </p>
                  </div>
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                  color: '#000',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '700'
                }}>
                  <ExternalLink size={16} />
                  {featuredArticle.buttonText || t.readMore}
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {view === 'admin-members' && userRole === 'superadmin' && (
        <div className="page-scroll">
          <div style={pageContentPadding}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>Člani</h1>
          {members.map(m => (
            <div key={m.id} style={{ ...glassCardStyle, padding: '14px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Login status indicator */}
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  background: m.hasLoggedIn ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: m.hasLoggedIn ? '#10b981' : '#ef4444',
                  flexShrink: 0
                }}>
                  {m.hasLoggedIn ? '✓' : '?'}
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>{m.ime} {m.priimek}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{m.email}</div>
                  {m.lastLoginAt && (
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginTop: '2px' }}>
                      Zadnja prijava: {m.lastLoginAt.toDate ? new Date(m.lastLoginAt.toDate()).toLocaleDateString('sl') : 'N/A'}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select value={m.role || 'user'} onChange={(e) => changeRole(m.id, e.target.value)} style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
                  <option value="user">Član</option><option value="admin">Admin</option><option value="superadmin">Super Admin</option>
                </select>
                <button onClick={() => toggleMembershipStatus(m.id)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', background: m.membershipPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: m.membershipPaid ? '#10b981' : '#f59e0b' }}>{m.membershipPaid ? '✓ ' + t.paid : '✗ ' + t.notPaid}</button>
              </div>
            </div>
          ))}

          {/* Load More Members Button */}
          {hasMoreMembers && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={loadMoreMembers}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                Naloži več ({MEMBERS_PER_PAGE} članov)
              </button>
            </div>
          )}
          </div>
        </div>
      )}

      {view === 'admin-stats' && (userRole === 'admin' || userRole === 'superadmin') && (() => {
        const completedTrainings = posts.filter(p => p.type === 'training' && p.completed && p.attendance);
        
        // Calculate attendance stats per member, using current member names
        const memberStats = {};
        completedTrainings.forEach(t => {
          (t.attendance || []).forEach(a => {
            if (!memberStats[a.email]) {
              // Get current member name from members collection
              const currentMember = members.find(m => m.email === a.email);
              const displayName = currentMember 
                ? `${currentMember.ime || ''} ${currentMember.priimek || ''}`.trim() 
                : a.name;
              memberStats[a.email] = { name: displayName || a.email, email: a.email, attended: 0, missed: 0, total: 0 };
            }
            memberStats[a.email].total++;
            if (a.present) memberStats[a.email].attended++;
            else memberStats[a.email].missed++;
          });
        });
        const statsArray = Object.values(memberStats).sort((a, b) => b.total - a.total);
        
        const formatDate = (dateStr) => {
          if (!dateStr) return '';
          const parts = dateStr.split('-');
          return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
        };

        return (
          <div className="page-scroll">
            <div style={pageContentPadding}>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>{t.trainingStats}</h1>
            
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {[
                { key: 'attendance', label: t.attendance },
                { key: 'noshow', label: t.absence },
                { key: 'notes', label: t.notes }
              ].map(tab => (
                <button key={tab.key} onClick={() => setStatsTab(tab.key)} style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                  background: statsTab === tab.key ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                }}>{tab.label}</button>
              ))}
            </div>
            
            {completedTrainings.length === 0 ? (
              <div style={{ ...glassCardStyle, textAlign: 'center', padding: '40px 20px' }}>
                <BarChart3 size={40} color="rgba(255,255,255,0.2)" style={{ marginBottom: '12px' }} />
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{t.noCompletedTrainings}</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '4px' }}>{t.statsAfterCompletion}</p>
              </div>
            ) : (
              <>
                {/* Attendance Tab */}
                {statsTab === 'attendance' && (
                  <div>
                    {statsArray.map((m, i) => {
                      const rate = m.total > 0 ? Math.round((m.attended / m.total) * 100) : 0;
                      return (
                        <div key={i} style={{ ...glassCardStyle, marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>{m.name}</div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444', fontSize: '18px', fontWeight: '700' }}>{rate}%</div>
                              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{m.attended}/{m.total} {t.trainings}</div>
                            </div>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${rate}%`, background: rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444', borderRadius: '3px' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* No-show Tab */}
                {statsTab === 'noshow' && (
                  <div>
                    {statsArray.filter(m => m.missed > 0).sort((a, b) => b.missed - a.missed).map((m, i) => (
                      <div key={i} style={{ ...glassCardStyle, marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>{m.name}</div>
                        <div style={{ 
                          background: 'rgba(239, 68, 68, 0.2)', 
                          color: '#ef4444', 
                          padding: '6px 14px', 
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}>
                          {m.missed}× {t.timesAbsent}
                        </div>
                      </div>
                    ))}
                    {statsArray.filter(m => m.missed > 0).length === 0 && (
                      <div style={{ ...glassCardStyle, textAlign: 'center', padding: '30px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{t.allPresent}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Notes Tab */}
                {statsTab === 'notes' && (
                  <div>
                    {completedTrainings.filter(tr => tr.trainerNotes).sort((a, b) => new Date(b.date) - new Date(a.date)).map((tr, i) => (
                      <div key={i} style={{ ...glassCardStyle, marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>{tr.title}</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{formatDate(tr.date)} • {tr.location || 'Brez lokacije'}</div>
                          </div>
                          <div style={{ 
                            background: 'rgba(16, 185, 129, 0.2)', 
                            color: '#10b981', 
                            padding: '4px 8px', 
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {(tr.attendance || []).filter(a => a.present).length}/{(tr.attendance || []).length}
                          </div>
                        </div>
                        <div style={{ 
                          background: 'rgba(0,0,0,0.2)', 
                          padding: '12px', 
                          borderRadius: '8px',
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: '13px',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {tr.trainerNotes}
                        </div>
                      </div>
                    ))}
                    {completedTrainings.filter(tr => tr.trainerNotes).length === 0 && (
                      <div style={{ ...glassCardStyle, textAlign: 'center', padding: '30px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{t.noTrainerNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            </div>
          </div>
        );
      })()}

      {view === 'news' && (
        <div className="page-scroll">
          <div style={pageContentPadding}>
          {/* Featured Article Box */}
          {featuredArticle?.active && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(202, 138, 4, 0.1) 100%)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Gold accent line */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                background: 'linear-gradient(90deg, #eab308, #ca8a04, #eab308)'
              }} />
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Trophy size={20} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: '#eab308', fontSize: '17px', fontWeight: '700', marginBottom: '6px' }}>
                    {featuredArticle.title}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.5' }}>
                    {featuredArticle.description}
                  </p>
                </div>
              </div>
              
              {featuredArticle.linkURL && (
                <a
                  href={featuredArticle.linkURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                    color: '#000',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '700',
                    marginTop: '4px'
                  }}
                >
                  <ExternalLink size={16} />
                  {featuredArticle.buttonText || t.readMore}
                </a>
              )}
            </div>
          )}
          
          {newsPosts.length === 0 && !featuredArticle?.active ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <FileText size={36} color="rgba(255,255,255,0.2)" />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', marginBottom: '8px' }}>Ni novic</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>{t.trainingsInCalendar}</p>
            </div>
          ) : newsPosts.map(p => <SlimEventCard key={p.id} post={p} onShowDetail={setSelectedEvent} />)}
          </div>
        </div>
      )}

      {view === 'calendar' && (
        <div className="page-scroll">
          <div style={{ ...pageContentPadding, padding: '14px', paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))' }}>
          <div style={{ background: '#1c1f22', borderRadius: '14px', padding: '16px', marginBottom: '14px', border: '1px solid #2b2d31' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} style={{ background: '#2b2d31', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', color: '#fff' }}><ChevronLeft size={18} /></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#fff', textTransform: 'capitalize' }}>{currentMonth.toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => { const n = new Date(); setCurrentMonth(new Date(n.getFullYear(), n.getMonth(), 1)); setSelectedDate(n.getDate()); }} style={{ background: '#c1372a', border: 'none', borderRadius: '5px', padding: '4px 10px', cursor: 'pointer', color: '#fff', fontSize: '11px', fontWeight: '600' }}>Danes</button>
              </div>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} style={{ background: '#2b2d31', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', color: '#fff' }}><ChevronRight size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
              {t.dayNames.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#888', padding: '4px' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {Array.from({ length: getDaysInMonth(currentMonth).startingDayOfWeek === 0 ? 6 : getDaysInMonth(currentMonth).startingDayOfWeek - 1 }).map((_, i) => <div key={`e-${i}`} style={{ aspectRatio: '1' }} />)}
              {Array.from({ length: getDaysInMonth(currentMonth).daysInMonth }).map((_, i) => renderCalendarDay(i + 1))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #2b2d31' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#c1372a' }} /><span style={{ fontSize: '10px', color: '#ccc' }}>{t.training}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }} /><span style={{ fontSize: '10px', color: '#ccc' }}>{t.match}</span></div>
            </div>
          </div>
          {selectedDate && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '12px' }}>{selectedDate}. {currentMonth.toLocaleDateString(language === 'en' ? 'en-US' : 'sl-SI', { month: 'long' })}</h3>
              {getEventsForDate(selectedDate).length === 0 ? (
                <div style={{ ...glassCardStyle, textAlign: 'center', padding: '24px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{t.noEvents}</p>
                </div>
              ) : getEventsForDate(selectedDate).map(e => <SlimEventCard key={e.id} post={e} onShowDetail={setSelectedEvent} />)}
            </div>
          )}
          </div>
        </div>
      )}

      {view === 'chat' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#0a0b0c'
        }}>
          {/* Messages area - takes remaining space and scrolls */}
          <div 
            ref={chatContainerRef} 
            style={{ 
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '14px',
              paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Users size={36} color="rgba(255,255,255,0.2)" />
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{t.noMessages}</p>
              </div>
            ) : messages.map(m => {
              const own = m.author === currentUser.email;
              const init = m.authorName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || m.author.charAt(0).toUpperCase();
              const memberData = members.find(mem => mem.email === m.author);
              const authorRole = memberData?.role || 'user';
              const roleConfig = ROLE_COLORS[authorRole];
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: own ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
                  {!own && (
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '50%', 
                      background: roleConfig.gradient,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: '12px', fontWeight: '700', color: '#fff', 
                      marginRight: '10px', alignSelf: 'flex-end',
                      boxShadow: `0 2px 10px ${roleConfig.bg}55`,
                      border: authorRole !== 'user' ? `2px solid ${roleConfig.bg}` : 'none'
                    }}>
                      {init}
                    </div>
                  )}
                  <div style={{ maxWidth: '75%', ...glassStyle, borderRadius: own ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', background: own ? roleConfig.gradient : 'rgba(28, 31, 34, 0.8)', position: 'relative' }}>
                    {!own && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: roleConfig.bg, fontWeight: '600' }}>{m.authorName}</span>
                        {authorRole !== 'user' && (
                          <span style={{ 
                            fontSize: '9px', 
                            fontWeight: '700', 
                            color: '#fff',
                            background: roleConfig.gradient,
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {roleConfig.label}
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ color: '#fff', fontSize: '14px', lineHeight: '1.5', wordBreak: 'break-word' }}>{renderMessageWithMentions(m.text)}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '10px', color: own ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)' }}>{m.timestamp?.toDate ? new Date(m.timestamp.toDate()).toLocaleTimeString('sl', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      {own && (
                        <button onClick={() => deleteMessage(m.id)} style={{ background: 'none', border: 'none', padding: '2px 6px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Mentions dropdown */}
          {showMentions && (
            <div style={{ 
              background: 'rgba(28, 31, 34, 0.98)',
              borderTop: '1px solid rgba(255,255,255,0.1)', 
              maxHeight: '120px', 
              overflowY: 'auto'
            }}>
              {mentionSuggestions.map((n, i) => <div key={i} onClick={() => insertMention(n)} style={{ padding: '12px 16px', color: '#fff', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>@{n}</div>)}
            </div>
          )}
          
          {/* Chat input bar */}
          <div style={{ 
            padding: '12px 16px',
            background: 'rgba(20, 22, 24, 0.98)',
            borderTop: '1px solid rgba(255,255,255,0.1)', 
            display: 'flex', 
            gap: '12px', 
            alignItems: 'center',
            flexShrink: 0
          }}>
            <input type="text" value={newMessage} onChange={(e) => handleMessageInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder={t.message} style={{ flex: 1, padding: '12px 18px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', color: '#fff', fontSize: '16px', outline: 'none' }} />
            <button onClick={sendMessage} disabled={isLoading || !newMessage.trim()} style={{ background: 'linear-gradient(135deg, #c1372a 0%, #9a2c22 100%)', color: '#fff', border: 'none', borderRadius: '50%', width: '44px', height: '44px', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !newMessage.trim() ? 0.5 : 1, boxShadow: '0 4px 15px rgba(193, 55, 42, 0.3)' }}>{isLoading ? <div style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}</button>
          </div>
          
          {/* Space for bottom nav */}
          <div style={{ 
            height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
            background: 'rgba(20, 22, 24, 0.98)',
            flexShrink: 0
          }} />
        </div>
      )}

      {view === 'profile' && (
        <div className="page-scroll">
          <div style={pageContentPadding}>
          <div style={{ ...glassCardStyle, padding: '24px', marginBottom: '14px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: ROLE_COLORS[userRole]?.gradient || ROLE_COLORS.user.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '700', color: '#fff', boxShadow: `0 4px 20px ${ROLE_COLORS[userRole]?.bg || ROLE_COLORS.user.bg}44` }}>{getInitials()}</div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{profileData.ime || profileData.priimek ? `${profileData.ime} ${profileData.priimek}`.trim() : currentUser.email}</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '6px' }}>{currentUser.email}</p>
                <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: userRole === 'superadmin' ? 'rgba(245, 158, 11, 0.2)' : userRole === 'admin' ? 'rgba(193, 55, 42, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: userRole === 'superadmin' ? '#f59e0b' : userRole === 'admin' ? '#c1372a' : '#3b82f6' }}>{userRole === 'superadmin' ? t.superAdmin : userRole === 'admin' ? t.trainer : t.member}</span>
              </div>
              <button onClick={() => { if (editingProfile) saveProfileData(); setEditingProfile(!editingProfile); }} style={{ background: editingProfile ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.1)', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{editingProfile ? t.save : t.edit}</button>
            </div>
            {editingProfile ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input type="text" placeholder={t.firstName} value={profileData.ime} onChange={(e) => setProfileData({ ...profileData, ime: e.target.value })} style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
                  <input type="text" placeholder={t.lastName} value={profileData.priimek} onChange={(e) => setProfileData({ ...profileData, priimek: e.target.value })} style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
                </div>
                <input type="tel" placeholder={t.phone} value={profileData.telefon} onChange={(e) => setProfileData({ ...profileData, telefon: e.target.value })} style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
                <input type="text" placeholder={t.morsNumber} value={profileData.morsStevilo} onChange={(e) => setProfileData({ ...profileData, morsStevilo: e.target.value })} style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{t.weaponLicenses}</span>
                    <button onClick={addOroznaListina} style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '4px 10px', borderRadius: '6px', border: 'none', fontSize: '11px', cursor: 'pointer' }}>+ {t.add}</button>
                  </div>
                  {profileData.orozneListine.map((l, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input placeholder={t.licenseType} value={l.vrsta} onChange={(e) => updateOroznaListina(i, 'vrsta', e.target.value)} style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '16px', minWidth: 0, boxSizing: 'border-box' }} />
                      <input placeholder={t.licenseNumber} value={l.stevilo} onChange={(e) => updateOroznaListina(i, 'stevilo', e.target.value)} style={{ width: '80px', flexShrink: 0, padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '16px', boxSizing: 'border-box' }} />
                      <button onClick={() => removeOroznaListina(i)} style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', flexShrink: 0 }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {profileData.telefon && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{t.phone}</span><span style={{ color: '#fff', fontSize: '14px' }}>{profileData.telefon}</span></div>}
                {profileData.morsStevilo && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>MORS</span><span style={{ color: '#fff', fontSize: '14px' }}>{profileData.morsStevilo}</span></div>}
                {profileData.orozneListine.length > 0 && <div style={{ paddingTop: '8px' }}><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{t.weaponLicenses}</span>{profileData.orozneListine.map((l, i) => <div key={i} style={{ color: '#fff', fontSize: '14px', marginLeft: '12px', marginTop: '6px' }}>• {l.vrsta} — {l.stevilo}</div>)}</div>}
              </div>
            )}
          </div>
          
          <div style={{ ...glassCardStyle, padding: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontSize: '15px' }}>{t.changePassword}</span>
              <button onClick={() => setShowPasswordForm(!showPasswordForm)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>{showPasswordForm ? t.cancel : t.change}</button>
            </div>
            {showPasswordForm && (
              <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
                <input type="password" placeholder={t.currentPassword} value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '16px' }} />
                <input type="password" placeholder={t.newPassword} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '16px' }} />
                <input type="password" placeholder={t.confirm} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '16px' }} />
                <button onClick={handlePasswordChange} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{t.confirm}</button>
              </div>
            )}
          </div>
          
          <div style={{ ...glassCardStyle, padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontSize: '15px' }}>{t.notifications}</span>
            <button onClick={async () => { const g = await requestNotificationPermission(); setNotificationsEnabled(g); if (!g) showToast(t.enableInSettings, 'info'); }} style={{ background: notificationsEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.1)', color: notificationsEnabled ? '#10b981' : '#fff', padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{notificationsEnabled ? '✓ ' + t.enabled : t.enable}</button>
          </div>
          
          {/* Language Toggle */}
          <div style={{ ...glassCardStyle, padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontSize: '15px' }}>{t.language}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setLanguage('sl')}
                style={{ 
                  padding: '8px 16px', 
                  background: language === 'sl' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(255,255,255,0.1)', 
                  border: 'none', 
                  borderRadius: '8px', 
                  color: '#fff', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  cursor: 'pointer' 
                }}
              >
                🇸🇮 SLO
              </button>
              <button 
                onClick={() => setLanguage('en')}
                style={{ 
                  padding: '8px 16px', 
                  background: language === 'en' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(255,255,255,0.1)', 
                  border: 'none', 
                  borderRadius: '8px', 
                  color: '#fff', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  cursor: 'pointer' 
                }}
              >
                🇬🇧 ENG
              </button>
            </div>
          </div>
          
          {/* Refresh Button */}
          <div style={{ ...glassCardStyle, padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontSize: '15px' }}>{t.refresh}</span>
            <button 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              style={{ 
                background: isRefreshing ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                color: '#fff', 
                padding: '8px 16px', 
                borderRadius: '8px', 
                border: 'none', 
                fontSize: '13px', 
                fontWeight: '600', 
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isRefreshing ? (
                <>
                  <div style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  {t.refreshing}
                </>
              ) : (
                <>
                  <RotateCcw size={14} />
                  {t.refresh}
                </>
              )}
            </button>
          </div>
          
          {/* Support & Social */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <a 
              href="mailto:strelskiklubvsk@gmail.com?subject=VSK Planner - Podpora"
              style={{ 
                ...glassCardStyle, 
                padding: '16px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '8px',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <div style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}>
                <Send size={22} color="#fff" />
              </div>
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{t.support}</span>
            </a>
            <a 
              href="https://www.facebook.com/profile.php?id=100089242328471"
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                ...glassCardStyle, 
                padding: '16px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '8px',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <div style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, #1877f2 0%, #0d65d9 100%)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: '700',
                color: '#fff'
              }}>
                f
              </div>
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>Facebook</span>
            </a>
          </div>
          
          <button onClick={handleLogout} style={{ width: '100%', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)' }}>{t.logout}</button>
          </div>
        </div>
      )}

      {/* Training Match - IDPA Timer and Scoring */}
      {view === 'training-match' && (userRole === 'admin' || userRole === 'superadmin') && (
        <div className="page-scroll">
          <div style={{ ...pageContentPadding, paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 20px))' }}>
          
          {/* SETUP PHASE */}
          {matchPhase === 'setup' && (
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '24px', textAlign: 'center' }}>
                🎯 {t.trainingMatch}
              </h1>
              
              {/* Club Members - Search & Select */}
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  👥 {t.clubMembers}
                </h2>
                
                {/* Search Input */}
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setShowMemberSuggestions(e.target.value.length > 0);
                    }}
                    onFocus={() => setShowMemberSuggestions(memberSearch.length > 0 || true)}
                    placeholder={t.searchMember}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '2px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '16px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                  
                  {/* Suggestions Dropdown */}
                  {showMemberSuggestions && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(28, 31, 34, 0.98)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 100
                    }}>
                      {members
                        .map(m => `${m.ime || ''} ${m.priimek || ''}`.trim() || m.email)
                        .filter(name => !matchShooters.includes(name))
                        .filter(name => memberSearch === '' || name.toLowerCase().includes(memberSearch.toLowerCase()))
                        .map((name, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setMatchShooters([...matchShooters, name]);
                              setMemberSearch('');
                              setShowMemberSuggestions(false);
                            }}
                            style={{
                              padding: '14px 16px',
                              color: '#fff',
                              fontSize: '15px',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px'
                            }}
                          >
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: '700',
                              color: '#fff'
                            }}>
                              {name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            {name}
                          </div>
                        ))
                      }
                      {members
                        .map(m => `${m.ime || ''} ${m.priimek || ''}`.trim() || m.email)
                        .filter(name => !matchShooters.includes(name))
                        .filter(name => memberSearch === '' || name.toLowerCase().includes(memberSearch.toLowerCase()))
                        .length === 0 && (
                        <div style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.5)', fontSize: '14px', textAlign: 'center' }}>
                          {t.noMembersFound}
                        </div>
                      )}
                      <div 
                        onClick={() => setShowMemberSuggestions(false)}
                        style={{
                          padding: '10px 16px',
                          color: 'rgba(255,255,255,0.4)',
                          fontSize: '12px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          borderTop: '1px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        ✕ {t.close}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Selected Members as Chips */}
                {matchShooters.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {matchShooters.map((name, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)',
                          border: '1px solid #10b981',
                          borderRadius: '20px',
                          color: '#10b981',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      >
                        {name}
                        <button
                          onClick={() => setMatchShooters(matchShooters.filter(s => s !== name))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#10b981',
                            cursor: 'pointer',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Add Guests */}
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  🎫 {t.guests}
                </h2>
                {matchGuests.map((guest, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={guest}
                      onChange={(e) => {
                        const newGuests = [...matchGuests];
                        newGuests[i] = e.target.value;
                        setMatchGuests(newGuests);
                      }}
                      placeholder={t.guestName}
                      style={{
                        flex: 1,
                        padding: '16px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '2px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '18px'
                      }}
                    />
                    <button
                      onClick={() => setMatchGuests(matchGuests.filter((_, idx) => idx !== i))}
                      style={{
                        padding: '16px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '2px solid #ef4444',
                        borderRadius: '12px',
                        color: '#ef4444',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setMatchGuests([...matchGuests, ''])}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '2px dashed rgba(59, 130, 246, 0.5)',
                    borderRadius: '12px',
                    color: '#3b82f6',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <UserPlus size={20} />
                  {t.addGuest}
                </button>
              </div>
              
              {/* Selected Count */}
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                marginBottom: '24px'
              }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{t.selectedShooters}: </span>
                <span style={{ color: '#fff', fontSize: '24px', fontWeight: '700' }}>
                  {matchShooters.length + matchGuests.filter(g => g.trim()).length}
                </span>
              </div>
              
              {/* Start Button */}
              <button
                onClick={() => {
                  const allShooters = [...matchShooters, ...matchGuests.filter(g => g.trim())];
                  if (allShooters.length < 1) {
                    showToast(t.selectAtLeastOne, 'error');
                    return;
                  }
                  setMatchPhase('entry');
                  setMatchCurrentShooterIndex(0);
                  setMatchTimeInput('');
                  setMatchPenalties(0);
                }}
                disabled={matchShooters.length + matchGuests.filter(g => g.trim()).length < 1}
                style={{
                  width: '100%',
                  padding: '20px',
                  background: matchShooters.length + matchGuests.filter(g => g.trim()).length < 1 
                    ? 'rgba(255,255,255,0.1)' 
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '16px',
                  color: '#fff',
                  fontSize: '20px',
                  fontWeight: '700',
                  cursor: matchShooters.length + matchGuests.filter(g => g.trim()).length < 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px'
                }}
              >
                {t.startMatch} →
              </button>
            </div>
          )}
          
          {/* ENTRY PHASE */}
          {matchPhase === 'entry' && (() => {
            const allShooters = [...matchShooters, ...matchGuests.filter(g => g.trim())];
            const currentShooter = allShooters[matchCurrentShooterIndex];
            
            // Check if all shooters have completed current stage
            const shootersWithRuns = matchRuns.filter(r => r.stage === matchCurrentStage).map(r => r.shooter);
            const allDone = allShooters.every(s => shootersWithRuns.includes(s));
            
            return (
              <div>
                {/* Stage Header */}
                <div style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>STAGE</div>
                  <div style={{ fontSize: '48px', fontWeight: '800', color: '#fff' }}>{matchCurrentStage}</div>
                </div>
                
                {/* Current Shooter */}
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>{t.shooter}</div>
                  
                  {/* Shooter Navigation */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <button
                      onClick={() => setMatchCurrentShooterIndex(Math.max(0, matchCurrentShooterIndex - 1))}
                      disabled={matchCurrentShooterIndex === 0}
                      style={{
                        padding: '12px 16px',
                        background: matchCurrentShooterIndex === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '10px',
                        color: matchCurrentShooterIndex === 0 ? 'rgba(255,255,255,0.2)' : '#fff',
                        cursor: matchCurrentShooterIndex === 0 ? 'not-allowed' : 'pointer',
                        fontSize: '24px'
                      }}
                    >
                      ◀
                    </button>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>{currentShooter}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                        {matchCurrentShooterIndex + 1} / {allShooters.length}
                      </div>
                    </div>
                    <button
                      onClick={() => setMatchCurrentShooterIndex(Math.min(allShooters.length - 1, matchCurrentShooterIndex + 1))}
                      disabled={matchCurrentShooterIndex === allShooters.length - 1}
                      style={{
                        padding: '12px 16px',
                        background: matchCurrentShooterIndex === allShooters.length - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '10px',
                        color: matchCurrentShooterIndex === allShooters.length - 1 ? 'rgba(255,255,255,0.2)' : '#fff',
                        cursor: matchCurrentShooterIndex === allShooters.length - 1 ? 'not-allowed' : 'pointer',
                        fontSize: '24px'
                      }}
                    >
                      ▶
                    </button>
                  </div>
                  
                  {/* Check if this shooter already has a run */}
                  {shootersWithRuns.includes(currentShooter) ? (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '2px solid #10b981',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center'
                    }}>
                      <Check size={32} color="#10b981" style={{ marginBottom: '8px' }} />
                      <div style={{ color: '#10b981', fontSize: '16px', fontWeight: '600' }}>{t.alreadyEntered}</div>
                      {(() => {
                        const run = matchRuns.find(r => r.stage === matchCurrentStage && r.shooter === currentShooter);
                        return run ? (
                          <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>
                            {run.rawTime.toFixed(2)}s + {run.penalties.toFixed(2)}s = <strong style={{ color: '#fff' }}>{run.total.toFixed(2)}s</strong>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ) : (
                    <>
                      {/* Time Input Display */}
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                          {t.timeSeconds}
                        </label>
                        <div
                          onClick={() => setShowKeypad(true)}
                          style={{
                            width: '100%',
                            padding: '20px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '2px solid rgba(255,255,255,0.2)',
                            borderRadius: '12px',
                            color: matchTimeInput ? '#fff' : 'rgba(255,255,255,0.3)',
                            fontSize: '36px',
                            fontWeight: '700',
                            textAlign: 'center',
                            cursor: 'pointer',
                            minHeight: '80px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {matchTimeInput || '0.00'}
                        </div>
                      </div>
                      
                      {/* Custom Keypad Modal */}
                      {showKeypad && (
                        <div style={{
                          position: 'fixed',
                          top: 0, left: 0, right: 0, bottom: 0,
                          background: 'rgba(0,0,0,0.95)',
                          zIndex: 2000,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          padding: '16px',
                          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
                          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 20px))'
                        }}>
                          {/* Display */}
                          <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '12px',
                            textAlign: 'center'
                          }}>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}>{t.timeSeconds.split(' ')[0]}</div>
                            <div style={{ color: '#fff', fontSize: '40px', fontWeight: '800', fontFamily: 'monospace' }}>
                              {matchTimeInput || '0'}
                            </div>
                          </div>
                          
                          {/* Keypad */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map(key => (
                              <button
                                key={key}
                                onClick={() => {
                                  if (key === '⌫') {
                                    setMatchTimeInput(matchTimeInput.slice(0, -1));
                                  } else if (key === '.') {
                                    if (!matchTimeInput.includes('.')) {
                                      setMatchTimeInput(matchTimeInput + '.');
                                    }
                                  } else {
                                    setMatchTimeInput(matchTimeInput + key);
                                  }
                                }}
                                style={{
                                  padding: '16px',
                                  background: key === '⌫' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)',
                                  border: key === '⌫' ? '2px solid #ef4444' : '2px solid rgba(255,255,255,0.2)',
                                  borderRadius: '12px',
                                  color: key === '⌫' ? '#ef4444' : '#fff',
                                  fontSize: '24px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                {key}
                              </button>
                            ))}
                          </div>
                          
                          {/* Confirm Button */}
                          <button
                            onClick={() => setShowKeypad(false)}
                            style={{
                              width: '100%',
                              padding: '16px',
                              marginTop: '12px',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              border: 'none',
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '18px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px'
                            }}
                          >
                            <Check size={24} />
                            {t.confirm}
                          </button>
                        </div>
                      )}
                      
                      {/* Penalty Buttons */}
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                          {t.penalties}: <span style={{ color: '#ef4444', fontWeight: '700' }}>+{matchPenalties}s</span>
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                          {[1, 3, 5, 10, 20].map(sec => (
                            <button
                              key={sec}
                              onClick={() => setMatchPenalties(matchPenalties + sec)}
                              style={{
                                padding: '18px 8px',
                                background: sec >= 20 ? 'rgba(127, 29, 29, 0.4)' : sec >= 10 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                                border: `2px solid ${sec >= 20 ? '#991b1b' : sec >= 10 ? '#ef4444' : '#f97316'}`,
                                borderRadius: '12px',
                                color: sec >= 20 ? '#fca5a5' : sec >= 10 ? '#ef4444' : '#f97316',
                                fontSize: '18px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              +{sec}s
                            </button>
                          ))}
                        </div>
                        {matchPenalties > 0 && (
                          <button
                            onClick={() => setMatchPenalties(0)}
                            style={{
                              width: '100%',
                              marginTop: '10px',
                              padding: '12px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '10px',
                              color: 'rgba(255,255,255,0.6)',
                              fontSize: '14px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px'
                            }}
                          >
                            <RotateCcw size={16} />
                            {t.resetPenalties}
                          </button>
                        )}
                      </div>
                      
                      {/* Total Preview */}
                      {matchTimeInput && (
                        <div style={{
                          background: 'rgba(0,0,0,0.3)',
                          borderRadius: '12px',
                          padding: '16px',
                          marginBottom: '16px',
                          textAlign: 'center'
                        }}>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}>{t.total}</div>
                          <div style={{ color: '#fff', fontSize: '36px', fontWeight: '800' }}>
                            {(parseFloat(matchTimeInput || 0) + matchPenalties).toFixed(2)}s
                          </div>
                        </div>
                      )}
                      
                      {/* Save Run Button */}
                      <button
                        onClick={() => {
                          const rawTime = parseFloat(matchTimeInput);
                          if (!rawTime || rawTime <= 0) {
                            showToast(t.enterValidTime, 'error');
                            return;
                          }
                          setMatchRuns([...matchRuns, {
                            shooter: currentShooter,
                            stage: matchCurrentStage,
                            rawTime: rawTime,
                            penalties: matchPenalties,
                            total: rawTime + matchPenalties
                          }]);
                          // Move to next shooter or stay
                          if (matchCurrentShooterIndex < allShooters.length - 1) {
                            setMatchCurrentShooterIndex(matchCurrentShooterIndex + 1);
                          }
                          setMatchTimeInput('');
                          setMatchPenalties(0);
                        }}
                        disabled={!matchTimeInput}
                        style={{
                          width: '100%',
                          padding: '20px',
                          background: !matchTimeInput ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          borderRadius: '14px',
                          color: '#fff',
                          fontSize: '20px',
                          fontWeight: '700',
                          cursor: !matchTimeInput ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px'
                        }}
                      >
                        <Check size={24} />
                        {t.save}
                      </button>
                    </>
                  )}
                </div>
                
                {/* Stage Progress */}
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                    Stage {matchCurrentStage} progress
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {allShooters.map((s, i) => {
                      const hasRun = shootersWithRuns.includes(s);
                      return (
                        <div
                          key={i}
                          style={{
                            padding: '6px 12px',
                            background: hasRun ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                            border: hasRun ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: hasRun ? '#10b981' : 'rgba(255,255,255,0.4)',
                            fontSize: '12px'
                          }}
                        >
                          {hasRun ? '✓' : '○'} {s.split(' ')[0]}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Bottom Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    onClick={() => {
                      setMatchCurrentStage(matchCurrentStage + 1);
                      setMatchCurrentShooterIndex(0);
                      setMatchTimeInput('');
                      setMatchPenalties(0);
                    }}
                    style={{
                      padding: '18px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '2px solid #3b82f6',
                      borderRadius: '14px',
                      color: '#3b82f6',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {t.newStage}
                  </button>
                  <button
                    onClick={() => setMatchPhase('results')}
                    disabled={matchRuns.length === 0}
                    style={{
                      padding: '18px',
                      background: matchRuns.length === 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                      border: 'none',
                      borderRadius: '14px',
                      color: matchRuns.length === 0 ? 'rgba(255,255,255,0.3)' : '#000',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: matchRuns.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {t.results} →
                  </button>
                </div>
              </div>
            );
          })()}
          
          {/* RESULTS PHASE */}
          {matchPhase === 'results' && (() => {
            const allShooters = [...matchShooters, ...matchGuests.filter(g => g.trim())];
            const stages = [...new Set(matchRuns.map(r => r.stage))].sort((a, b) => a - b);
            
            // Calculate totals per shooter
            const totals = allShooters.map(shooter => {
              const runs = matchRuns.filter(r => r.shooter === shooter);
              const totalRaw = runs.reduce((sum, r) => sum + r.rawTime, 0);
              const totalPenalties = runs.reduce((sum, r) => sum + r.penalties, 0);
              const totalTime = runs.reduce((sum, r) => sum + r.total, 0);
              return { shooter, totalRaw, totalPenalties, totalTime, runs };
            }).sort((a, b) => a.totalTime - b.totalTime);
            
            const winnerTime = totals[0]?.totalTime || 0;
            
            // Split into pages of 8 shooters max for export
            const SHOOTERS_PER_PAGE = 8;
            const totalPages = Math.ceil(totals.length / SHOOTERS_PER_PAGE);
            
            const exportToPNG = async () => {
              if (resultsRef.current) {
                try {
                  const dateStr = new Date().toISOString().split('T')[0];
                  const files = [];
                  
                  // Create a temporary container for export
                  const tempContainer = document.createElement('div');
                  tempContainer.style.position = 'absolute';
                  tempContainer.style.left = '-9999px';
                  tempContainer.style.top = '0';
                  document.body.appendChild(tempContainer);
                  
                  for (let page = 0; page < totalPages; page++) {
                    const startIdx = page * SHOOTERS_PER_PAGE;
                    const endIdx = Math.min(startIdx + SHOOTERS_PER_PAGE, totals.length);
                    const pageShooters = totals.slice(startIdx, endIdx);
                    
                    // Dynamic sizing based on shooters count
                    const shooterCount = pageShooters.length;
                    const scaleFactor = shooterCount <= 4 ? 1 : shooterCount <= 6 ? 0.9 : 0.8;
                    
                    // Build the export HTML
                    const exportDiv = document.createElement('div');
                    exportDiv.style.background = '#0a0b0c';
                    exportDiv.style.padding = '20px';
                    exportDiv.style.borderRadius = '20px';
                    exportDiv.style.width = '380px';
                    
                    exportDiv.innerHTML = `
                      <div style="text-align: center; margin-bottom: ${20 * scaleFactor}px;">
                        <div style="font-size: ${14 * scaleFactor}px; color: rgba(255,255,255,0.5); margin-bottom: 4px; font-family: system-ui, -apple-system, sans-serif;">
                          ${new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'sl-SI', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <h1 style="font-size: ${28 * scaleFactor}px; font-weight: 800; color: #fff; margin: 0 0 4px 0; font-family: system-ui, -apple-system, sans-serif;">
                          🏆 ${t.results}
                        </h1>
                        <div style="color: rgba(255,255,255,0.5); font-size: ${14 * scaleFactor}px; font-family: system-ui, -apple-system, sans-serif;">
                          ${stages.length} ${t.stages} • ${allShooters.length} ${t.shooters}${totalPages > 1 ? ` • ${page + 1}/${totalPages}` : ''}
                        </div>
                      </div>
                      <div style="display: grid; gap: ${10 * scaleFactor}px;">
                        ${pageShooters.map((shooter, idx) => {
                          const i = startIdx + idx; // Overall rank
                          const bgStyle = i === 0 
                            ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(202, 138, 4, 0.1) 100%)' 
                            : i === 1 
                              ? 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(107, 114, 128, 0.1) 100%)'
                              : i === 2
                                ? 'linear-gradient(135deg, rgba(180, 83, 9, 0.2) 0%, rgba(146, 64, 14, 0.1) 100%)'
                                : 'rgba(255,255,255,0.03)';
                          const borderStyle = i === 0 
                            ? '2px solid rgba(234, 179, 8, 0.5)' 
                            : i === 1
                              ? '2px solid rgba(156, 163, 175, 0.3)'
                              : i === 2
                                ? '2px solid rgba(180, 83, 9, 0.3)'
                                : '1px solid rgba(255,255,255,0.1)';
                          const rankBg = i === 0 ? '#eab308' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : 'rgba(255,255,255,0.1)';
                          const rankColor = i < 3 ? '#000' : '#fff';
                          const timeColor = i === 0 ? '#eab308' : '#fff';
                          
                          return `
                            <div style="background: ${bgStyle}; border: ${borderStyle}; border-radius: ${14 * scaleFactor}px; padding: ${14 * scaleFactor}px ${16 * scaleFactor}px;">
                              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ${6 * scaleFactor}px;">
                                <div style="display: flex; align-items: center; gap: ${10 * scaleFactor}px;">
                                  <div style="width: ${32 * scaleFactor}px; height: ${32 * scaleFactor}px; border-radius: 50%; background: ${rankBg}; display: flex; align-items: center; justify-content: center; font-size: ${14 * scaleFactor}px; font-weight: 800; color: ${rankColor}; font-family: system-ui, -apple-system, sans-serif;">
                                    ${i + 1}
                                  </div>
                                  <div style="font-size: ${18 * scaleFactor}px; font-weight: 700; color: #fff; font-family: system-ui, -apple-system, sans-serif;">
                                    ${shooter.shooter}
                                  </div>
                                </div>
                              </div>
                              <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                                <div style="color: rgba(255,255,255,0.5); font-size: ${12 * scaleFactor}px; font-family: system-ui, -apple-system, sans-serif;">
                                  Raw: ${shooter.totalRaw.toFixed(2)}s • Pen: +${shooter.totalPenalties.toFixed(2)}s
                                </div>
                                <div>
                                  <div style="font-size: ${24 * scaleFactor}px; font-weight: 800; color: ${timeColor}; text-align: right; font-family: system-ui, -apple-system, sans-serif;">
                                    ${shooter.totalTime.toFixed(2)}s
                                  </div>
                                  ${i > 0 ? `<div style="font-size: ${11 * scaleFactor}px; color: #ef4444; text-align: right; font-family: system-ui, -apple-system, sans-serif;">+${(shooter.totalTime - winnerTime).toFixed(2)}s</div>` : ''}
                                </div>
                              </div>
                            </div>
                          `;
                        }).join('')}
                      </div>
                      <div style="text-align: center; margin-top: ${16 * scaleFactor}px; color: rgba(255,255,255,0.3); font-size: ${12 * scaleFactor}px; font-family: system-ui, -apple-system, sans-serif;">
                        VSK Planner
                      </div>
                    `;
                    
                    tempContainer.appendChild(exportDiv);
                    
                    const canvas = await html2canvas(exportDiv, {
                      backgroundColor: '#0a0b0c',
                      scale: 2
                    });
                    
                    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                    const fileName = totalPages > 1 
                      ? `trening-tekma-${dateStr}-${page + 1}.png`
                      : `trening-tekma-${dateStr}.png`;
                    const file = new File([blob], fileName, { type: 'image/png' });
                    files.push(file);
                    
                    tempContainer.removeChild(exportDiv);
                  }
                  
                  document.body.removeChild(tempContainer);
                  
                  // Share or download files
                  if (navigator.share && navigator.canShare && navigator.canShare({ files: files })) {
                    await navigator.share({
                      files: files,
                      title: 'Trening Tekma Rezultati'
                    });
                  } else {
                    // Fallback: download each file
                    for (const file of files) {
                      const url = URL.createObjectURL(file);
                      const link = document.createElement('a');
                      link.download = file.name;
                      link.href = url;
                      link.click();
                      URL.revokeObjectURL(url);
                      // Small delay between downloads
                      await new Promise(r => setTimeout(r, 300));
                    }
                  }
                } catch (e) {
                  if (e.name !== 'AbortError') {
                    showToast(t.exportError + ': ' + e.message, 'error');
                  }
                }
              }
            };
            
            return (
              <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px - env(safe-area-inset-bottom, 0px))', maxHeight: '600px' }}>
                {/* Scrollable Results Card */}
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
                  <div ref={resultsRef} style={{ background: '#0a0b0c', padding: '20px', borderRadius: '20px' }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                        {new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'sl-SI', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
                        🏆 {t.results}
                      </h1>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                        {stages.length} {t.stages} • {allShooters.length} {t.shooters}
                        {totalPages > 1 && <span style={{ color: '#10b981' }}> • {totalPages} {language === 'en' ? 'images' : 'slik'}</span>}
                      </div>
                    </div>
                    
                    {/* Leaderboard */}
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {totals.map((shooter, i) => (
                        <div
                          key={shooter.shooter}
                          style={{
                            background: i === 0 
                              ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(202, 138, 4, 0.1) 100%)' 
                              : i === 1 
                                ? 'linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(107, 114, 128, 0.1) 100%)'
                                : i === 2
                                  ? 'linear-gradient(135deg, rgba(180, 83, 9, 0.2) 0%, rgba(146, 64, 14, 0.1) 100%)'
                                  : 'rgba(255,255,255,0.03)',
                            border: i === 0 
                              ? '2px solid rgba(234, 179, 8, 0.5)' 
                              : i === 1
                                ? '2px solid rgba(156, 163, 175, 0.3)'
                                : i === 2
                                  ? '2px solid rgba(180, 83, 9, 0.3)'
                                  : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px',
                            padding: '16px 20px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: i === 0 ? '#eab308' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : 'rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                fontWeight: '800',
                                color: i < 3 ? '#000' : '#fff'
                              }}>
                                {i + 1}
                              </div>
                              <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>
                                {shooter.shooter}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                              Raw: {shooter.totalRaw.toFixed(2)}s • Pen: +{shooter.totalPenalties.toFixed(2)}s
                            </div>
                            <div>
                              <div style={{ 
                                fontSize: '28px', 
                                fontWeight: '800', 
                                color: i === 0 ? '#eab308' : '#fff',
                                textAlign: 'right'
                              }}>
                                {shooter.totalTime.toFixed(2)}s
                              </div>
                              {i > 0 && (
                                <div style={{ fontSize: '12px', color: '#ef4444', textAlign: 'right' }}>
                                  +{(shooter.totalTime - winnerTime).toFixed(2)}s
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* VSK Planner watermark */}
                    <div style={{ textAlign: 'center', marginTop: '20px', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                      VSK Planner
                    </div>
                  </div>
                </div>
                
                {/* Fixed Actions at bottom */}
                <div style={{ flexShrink: 0, display: 'grid', gap: '12px' }}>
                  <button
                    onClick={exportToPNG}
                    style={{
                      width: '100%',
                      padding: '18px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: '14px',
                      color: '#fff',
                      fontSize: '17px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                  >
                    {t.saveAsImage} {totalPages > 1 && `(${totalPages})`}
                  </button>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button
                      onClick={() => setMatchPhase('entry')}
                      style={{
                        padding: '16px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ← {t.back}
                    </button>
                    <button
                      onClick={() => {
                        setMatchPhase('setup');
                        setMatchShooters([]);
                        setMatchGuests([]);
                        setMatchRuns([]);
                        setMatchCurrentStage(1);
                        setView('admin-dashboard');
                      }}
                      style={{
                        padding: '16px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '2px solid #ef4444',
                        borderRadius: '12px',
                        color: '#ef4444',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {t.finish}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
          </div>
        </div>
      )}

      {/* New Member Modal */}
      {showNewMemberForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '20px' }}>
          <div style={{ ...glassStyle, borderRadius: '20px', padding: '24px', maxWidth: '450px', width: '100%' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>Dodaj novega člana</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateMember(newMemberData); }} style={{ display: 'grid', gap: '12px' }}>
              <input
                type="email"
                placeholder="Email *"
                required
                value={newMemberData.email}
                onChange={(e) => setNewMemberData({ ...newMemberData, email: e.target.value })}
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <input
                type="text"
                placeholder="Ime *"
                required
                value={newMemberData.ime}
                onChange={(e) => setNewMemberData({ ...newMemberData, ime: e.target.value })}
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <input
                type="text"
                placeholder="Priimek *"
                required
                value={newMemberData.priimek}
                onChange={(e) => setNewMemberData({ ...newMemberData, priimek: e.target.value })}
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <input
                type="tel"
                placeholder="Telefon"
                value={newMemberData.telefon}
                onChange={(e) => setNewMemberData({ ...newMemberData, telefon: e.target.value })}
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <input
                type="text"
                placeholder="MORS številka"
                value={newMemberData.morsStevilo}
                onChange={(e) => setNewMemberData({ ...newMemberData, morsStevilo: e.target.value })}
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <input
                type="password"
                placeholder="Geslo * (vsaj 6 znakov)"
                required
                minLength={6}
                value={newMemberData.password}
                onChange={(e) => setNewMemberData({ ...newMemberData, password: e.target.value })}
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <select
                value={newMemberData.role}
                onChange={(e) => setNewMemberData({ ...newMemberData, role: e.target.value })}
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px' }}
              >
                <option value="user">Član</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
              <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '10px', padding: '12px', marginTop: '8px' }}>
                <p style={{ fontSize: '12px', color: '#fbbf24', lineHeight: '1.5' }}>⚠️ Opozorilo: Po ustvarjanju člana boste odjavljeni! Pošljite novemu članu email in geslo.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMemberForm(false);
                    setNewMemberData({ email: '', ime: '', priimek: '', telefon: '', morsStevilo: '', role: 'user', password: '' });
                  }}
                  style={{ padding: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Prekliči
                </button>
                <button
                  type="submit"
                  style={{ padding: '12px', background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Ustvari
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom navigation with glassmorphism */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        ...glassStyle,
        borderRadius: 0,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 0 calc(12px + env(safe-area-inset-bottom, 0px))',
        zIndex: 100
      }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setView(t.key)} style={{
            background: 'transparent',
            border: 'none',
            color: view === t.key || ((view.startsWith('admin-') || view === 'training-match') && t.key === 'admin-dashboard') ? '#c1372a' : 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            fontWeight: '600',
            padding: '6px 12px',
            transition: 'color 0.2s'
          }}>
            <t.icon size={22} />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Export App wrapped with ErrorBoundary
export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
