import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

const Chats = () => {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]); // State to store projects
  const [selectedProject, setSelectedProject] = useState<any>(null); // State to store the selected project
  const [messages, setMessages] = useState<any[]>([]); // State to store messages
  const [newMessage, setNewMessage] = useState(''); // State to store new message input
  const [loading, setLoading] = useState(true); // State to manage loading state

  // Fetch projects when the component mounts
  useEffect(() => {
    const fetchProjects = async () => {
      if (user) {
        console.log('Fetching projects for user:', user.email); // Debugging statement
        // Query to fetch projects where the current user's email is in the assignedTo array inside tasks
        const projectsQuery = query(
          collection(db, 'projects'),
          where('tasks', 'array-contains', {assignedTo:[{email: user.email}]})
        );
        // Execute the query and get the snapshot
        const projectsSnapshot = await getDocs(projectsQuery);
        // Map the snapshot to get project data
        const projectsData = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Fetched projects:', projectsData); // Debugging statement
        // Store fetched projects in state
        setProjects(projectsData);
        setLoading(false); // Set loading to false after fetching projects
      }
    };

    fetchProjects();
  }, [user]);

  // Fetch messages when a project is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (selectedProject) {
        console.log('Fetching messages for project:', selectedProject.id); // Debugging statement
        const messagesQuery = query(
          collection(db, 'projects', selectedProject.id, 'chats'),
          orderBy('timestamp', 'asc')
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        const messagesData = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Fetched messages:', messagesData); // Debugging statement
        setMessages(messagesData); // Store fetched messages in state
      }
    };

    fetchMessages();
  }, [selectedProject]);

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (newMessage.trim() !== '' && selectedProject && user) {
      await addDoc(collection(db, 'projects', selectedProject.id, 'chats'), {
        text: newMessage,
        senderId: user.uid,
        timestamp: serverTimestamp(),
      });
      setNewMessage(''); // Clear the input field
      // Fetch messages again to update the list
      const messagesQuery = query(
        collection(db, 'projects', selectedProject.id, 'chats'),
        orderBy('timestamp', 'asc')
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const messagesData = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(messagesData); // Update messages in state
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Chats</h1>
      <div className="flex">
        <div className="w-1/3">
          <h2 className="text-xl font-semibold">Projects</h2>
          {loading ? (
            <p>Loading projects...</p> // Display loading message while fetching projects
          ) : (
            <ul>
              {projects.length > 0 ? (
                projects.map(project => (
                  <li
                    key={project.id}
                    className={`p-2 cursor-pointer ${selectedProject?.id === project.id ? 'bg-gray-200' : ''}`}
                    onClick={() => setSelectedProject(project)}
                  >
                    {project.name}
                  </li>
                ))
              ) : (
                <p>No projects available</p>
              )}
            </ul>
          )}
        </div>
        <div className="w-2/3">
          {selectedProject ? (
            <>
              <h2 className="text-xl font-semibold">Chat with {selectedProject.name}</h2>
              <div className="border p-4 h-64 overflow-y-scroll">
                {user && messages.map(message => (
                  <div key={message.id} className={`p-2 ${message.senderId === user.uid ? 'text-right' : 'text-left'}`}>
                    <p>{message.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="border p-2 w-full"
                  placeholder="Type your message..."
                />
                <button onClick={handleSendMessage} className="bg-blue-500 text-white p-2 mt-2">
                  Send
                </button>
              </div>
            </>
          ) : (
            <p>Select a project to start chatting</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chats;
