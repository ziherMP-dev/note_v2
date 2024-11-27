import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PlusCircle, Trash2, LogOut, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface Note {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  notification_time?: string;
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [notificationTime, setNotificationTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchNotes();
    fetchUserEmail();
    fetchDisplayName();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (notificationTime && Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error('Notification permission denied');
          return;
        }
      }

      const notificationDate = notificationTime ? new Date(notificationTime) : null;
      const utcNotificationTime = notificationDate 
        ? notificationDate.toISOString()
        : null;

      const { error } = await supabase
        .from('notes')
        .insert([{ 
          content: newNote,
          user_id: user.id,
          notification_time: utcNotificationTime
        }]);

      if (error) throw error;
      
      if (notificationTime) {
        scheduleNotification(newNote, notificationTime);
      }

      toast.success('Note added successfully!');
      setNewNote('');
      setNotificationTime('');
      fetchNotes();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  function scheduleNotification(content: string, notificationTime: string) {
    const timeUntilNotification = new Date(notificationTime).getTime() - new Date().getTime();
    
    if (timeUntilNotification > 0) {
      setTimeout(() => {
        new Notification('Note Reminder', {
          body: content,
          icon: '/icon-512.png'
        });
      }, timeUntilNotification);
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

  function formatLocalDateTime(dateString: string) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${month} ${day}, ${year}, ${hours}:${minutes}`;
  }

  function formatTimeRemaining(notificationTime: string) {
    const timeUntilNotification = new Date(notificationTime).getTime() - currentTime.getTime();
    
    if (timeUntilNotification <= 0) {
      return null;
    }
    
    if (timeUntilNotification < 60000) { // less than 1 minute (in milliseconds)
      const seconds = Math.ceil(timeUntilNotification / 1000);
      return `(in ${seconds} seconds)`;
    }
    
    const minutes = Math.ceil(timeUntilNotification / (1000 * 60));
    return `(in ${minutes} minutes)`;
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
                placeholder="Write your note here..."
                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
              <input
                type="datetime-local"
                value={notificationTime}
                onChange={(e) => setNotificationTime(e.target.value)}
                className="rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Add Note
              </button>
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
                  {note.notification_time && (
                    <p className="text-sm text-purple-600 mt-2">
                      Reminder: {formatLocalDateTime(note.notification_time)}
                      {formatTimeRemaining(note.notification_time) && (
                        <span className="ml-2">
                          {formatTimeRemaining(note.notification_time)}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {formatLocalDateTime(note.created_at)}
              </p>
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