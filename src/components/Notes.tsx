import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PlusCircle, Trash2, LogOut, Settings, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

interface Note {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  notification_time: string | null;
  notification_sent: boolean;
}

const remoteLog = (...args: any[]) => {
  const debugURL = 'https://debug.ziher.dev/log';
  
  fetch(debugURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      logs: args
    })
  }).catch(() => {
    // Silently fail if logging fails
  });
};

const debugAlert = (...args: any[]) => {
  alert(args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  ).join('\n'));
};

const debugPWAStatus = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = 'standalone' in window.navigator && (window.navigator as any).standalone === true;
  
  debugAlert({
    userAgent: navigator.userAgent,
    isIOS,
    hasStandaloneProperty: 'standalone' in window.navigator,
    standaloneValue: (window.navigator as any).standalone,
    isStandalone,
    isIOSPWA: isIOS && isStandalone
  });
};

const sendNotification = async (note: Note) => {
  try {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = 'standalone' in window.navigator && (window.navigator as any).standalone === true;
    
    debugAlert({
      message: 'Notification Debug Info',
      isIOS,
      isStandalone,
      hasNotificationAPI: 'Notification' in window,
      notificationPermission: Notification.permission,
      noteDetails: {
        id: note.id,
        time: note.notification_time,
        content: note.content.substring(0, 50) // First 50 chars
      }
    });

    if (!('Notification' in window)) {
      debugAlert('Notifications not supported on this device/browser');
      return;
    }

    if (Notification.permission !== 'granted') {
      debugAlert('Notification permission not granted');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    remoteLog('Service Worker ready:', registration);
    
    await registration.showNotification('Note Reminder', {
      body: note.content,
      icon: '/icon-512.png',
      badge: '/icon-512.png',
      tag: `note-${note.id}`,
      actions: [
        {
          action: 'open',
          title: 'Open App'
        }
      ]
    });
    remoteLog('Notification sent successfully');

    await supabase
      .from('notes')
      .update({ notification_sent: true })
      .eq('id', note.id);
    remoteLog('Database updated - notification marked as sent');

  } catch (error) {
    debugAlert('Error in sendNotification:', error);
  }
};

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [notificationTime, setNotificationTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    fetchNotes();
    fetchUserEmail();
    fetchDisplayName();
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !('Notification' in window)) {
      setShowIOSPrompt(true);
    }
  }, []);

  useEffect(() => {
    const notesWithNotifications = notes.filter(
      note => note.notification_time && !note.notification_sent
    );
    remoteLog('Notes with pending notifications:', notesWithNotifications);

    if (notesWithNotifications.length === 0) return;

    const interval = setInterval(() => {
      notesWithNotifications.forEach(note => {
        if (!note.notification_time || note.notification_sent) return;
        
        const timeLeft = new Date(note.notification_time).getTime() - new Date().getTime();
        remoteLog(`Time left for note ${note.id}:`, timeLeft);
        
        if (timeLeft <= 0) {
          remoteLog('Triggering notification for note:', note.id);
          sendNotification(note);
          setNotes(currentNotes =>
            currentNotes.map(n =>
              n.id === note.id ? { ...n, notification_sent: true } : n
            )
          );
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [notes]);

  async function fetchNotes() {
    try {
      const { data: notes, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (notes) setNotes(notes);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserEmail() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    } catch (error: any) {
      toast.error('Error fetching user info');
    }
  }

  async function fetchDisplayName() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        if (data?.display_name) {
          setDisplayName(data.display_name);
        }
      }
    } catch (error: any) {
      console.error('Error fetching display name:', error);
    }
  }

  const getTimeRemaining = (notificationTime: string) => {
    const now = new Date();
    const target = new Date(notificationTime);
    const diff = target.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    let timeString = '';
    if (days > 0) timeString += `${days}d `;
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0) timeString += `${minutes}m `;
    if (days === 0 && hours === 0 && minutes === 0) {
      timeString = `${seconds}s`;
    }
    
    return timeString.trim();
  };

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('User not authenticated');

      const noteData: Partial<Note> = {
        content: newNote,
        user_id: user.id,
      };

      if (notificationTime) {
        noteData.notification_time = new Date(notificationTime).toISOString();
        noteData.notification_sent = false;
      }

      const { error } = await supabase
        .from('notes')
        .insert([noteData]);

      if (error) throw error;
      
      toast.success('Note added successfully!');
      setNewNote('');
      setNotificationTime('');
      fetchNotes();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function deleteNote(id: number) {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setNotes(notes.filter(note => note.id !== id));
      toast.success('Note deleted successfully!');
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully!');
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      {showIOSPrompt && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            To receive notifications on iOS:
            <ol className="list-decimal ml-4 mt-2">
              <li>Add this app to your home screen</li>
              <li>Open the app from your home screen</li>
              <li>Enable notifications in iOS Settings for this app</li>
            </ol>
          </p>
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="relative">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Settings className="h-5 w-5 text-gray-600" />
            </button>
            
            {isSettingsOpen && (
              <div className="absolute left-0 mt-2 w-64 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Settings</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Display Name</label>
                      {isEditingName ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="flex-1 text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                            placeholder={userEmail}
                          />
                          <button
                            onClick={async () => {
                              try {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (user) {
                                  const { error } = await supabase
                                    .from('profiles')
                                    .upsert({ 
                                      id: user.id, 
                                      display_name: displayName || userEmail 
                                    });
                                  if (error) throw error;
                                  setIsEditingName(false);
                                  toast.success('Display name updated!');
                                }
                              } catch (error: any) {
                                toast.error('Failed to update display name');
                              }
                            }}
                            className="px-2 py-1 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="px-2 py-1 text-xs font-medium text-gray-500 rounded hover:text-purple-600"
                        >
                          Change Display Name
                        </button>
                      )}
                    </div>
                    <button
                      onClick={debugPWAStatus}
                      className="px-2 py-1 text-xs font-medium text-gray-500 rounded hover:text-purple-600"
                    >
                      Debug PWA Status
                    </button>
                    <button
                      onClick={() => {
                        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                        const isStandalone = 'standalone' in window.navigator && (window.navigator as any).standalone === true;
                        debugAlert({
                          userAgent: navigator.userAgent,
                          isIOS,
                          isStandalone,
                          hasNotificationAPI: 'Notification' in window,
                          notificationPermission: Notification.permission,
                          isPWA: window.matchMedia('(display-mode: standalone)').matches
                        });
                      }}
                      className="px-2 py-1 text-xs font-medium text-gray-500 rounded hover:text-purple-600"
                    >
                      Show Debug Info
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {displayName || userEmail}
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center px-4 py-2 text-sm text-red-600 hover:text-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>

        <form onSubmit={addNote} className="mb-8">
          <div className="space-y-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write your note here... v_7.0.0"
                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Add Note
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-400" />
              <input
                type="datetime-local"
                value={notificationTime}
                onChange={(e) => setNotificationTime(e.target.value)}
                className="rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>
        </form>

        <div className="space-y-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                  {note.notification_time && !note.notification_sent && (
                    <div className="mt-2 flex items-center gap-2">
                      <Bell className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-purple-600">
                        {getTimeRemaining(note.notification_time) || 'Time expired'}
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(note.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </p>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No notes yet. Create your first note!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}