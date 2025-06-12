import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { Users, UserCheck, Loader2, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import ChangeDesignationModal from '../components/ChangeDesignationModal';
import ChangeJoinDateModal from '../components/ChangeJoinDateModal';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  verified: boolean;
  createdAt: string;
  designation: string;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unverified' | 'customers'>('all');
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDesignationModalOpen, setIsDesignationModalOpen] = useState(false);
  const [isJoinDateModalOpen, setIsJoinDateModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];

      setUsers(usersData.filter(user => user.role !== 'customer'));
      setCustomers(usersData.filter(user => user.role === 'customer'));
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch users');
      setLoading(false);
    }
  };

  const updateUserState = (userId: string, verified: boolean) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, verified } : user
      )
    );

    setCustomers(prevCustomers =>
      prevCustomers.map(customer =>
        customer.id === userId ? { ...customer, verified } : customer
      )
    );
  };

  const verifyUser = async (userId: string) => {
    try {
      setProcessingUser(userId);
      await updateDoc(doc(db, 'users', userId), {
        verified: true
      });
      updateUserState(userId, true);
      toast.success('User verified successfully');
    } catch (error) {
      toast.error('Failed to verify user');
    } finally {
      setProcessingUser(null);
    }
  };

  const unverifyUser = async (userId: string) => {
    try {
      setProcessingUser(userId);
      await updateDoc(doc(db, 'users', userId), {
        verified: false
      });
      updateUserState(userId, false);
      toast.success('User unverified successfully');
    } catch (error) {
      toast.error('Failed to unverify user');
    } finally {
      setProcessingUser(null);
    }
  };

  const handleDesignationChange = (newDesignation: string) => {
    setUsers(users.map(user =>
      user.id === selectedUser?.id
        ? { ...user, designation: newDesignation }
        : user
    ));
  };

  const handleJoinDateChange = (newJoinDate: string) => {
    setUsers(users.map(user =>
      user.id === selectedUser?.id
        ? { ...user, createdAt: newJoinDate }
        : user
    ));
  };

  const displayedCustomers = activeTab === 'customers'
    ? customers
    : customers.filter(customer => !customer.verified);

  const displayedUsers = activeTab === 'all'
    ? users.filter(user => user.verified)
    : activeTab === 'unverified'
      ? users.filter(user => !user.verified)
      : users;

  const updateUserRole = (userId: string, newRole: string) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      )
    );
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    try {
      setProcessingUser(userId);
      const newRole = currentRole === 'admin' ? 'member' : 'admin';
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
      updateUserRole(userId, newRole);
      toast.success(`User role changed to ${newRole}`);
    } catch (error) {
      toast.error('Failed to change user role');
    } finally {
      setProcessingUser(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 py-8 watermark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl overflow-hidden shadow-md">
          {/* Header */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  ${activeTab === 'all' ? 'border-black/90 text-black/90' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                <Users className="h-5 w-5" />
                <span>All Members ({users.filter(u => u.verified).length})</span>
              </button>
              <button
                onClick={() => setActiveTab('unverified')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  ${activeTab === 'unverified' ? 'border-black/90 text-black/90' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                <UserCheck className="h-5 w-5" />
                <span>Unverified ({users.filter(u => !u.verified).length})</span>
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  ${activeTab === 'customers' ? 'border-black/90 text-black/90' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                <Users className="h-5 w-5" />
                <span>Customers ({customers.length})</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-center px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-center px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    {activeTab !== 'customers' && (
                      <th className="text-center px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Designation
                      </th>
                    )}
                    <th className="text-center px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    {activeTab === 'customers' && (
                      <th className="text-center px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    )}
                    <th className="text-center px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="text-center px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(activeTab === 'customers' ? displayedCustomers : displayedUsers).map((user) => (
                    <tr key={user.id}>
                      <td className="text-center px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.fullName}
                        </div>
                      </td>
                      <td className="text-center px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </td>
                      {activeTab !== 'customers' && (
                        <td className="text-center px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.designation ?? "User"}</div>
                        </td>
                      )}
                      <td className="text-center px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{user.role}</div>
                      </td>
                      {activeTab === 'customers' && (
                        <td className="text-center px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {user.verified ? 'Verified' : 'Unverified'}
                          </span>
                        </td>
                      )}
                      <td className="text-center px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="text-center px-6 py-4 whitespace-nowrap text-right text-xs font-medium flex justify-center">
                        <div className="flex justify-end gap-2">
                          {activeTab === 'customers' ? (
                            <>
                              <button
                                onClick={() => {
                                  user.verified ? unverifyUser(user.id) : verifyUser(user.id);
                                }}
                                disabled={processingUser === user.id}
                                className={`flex items-center space-x-1 ${user.verified ? 'text-red-600 hover:text-red-900' : 'text-blue-600 hover:text-blue-900'}`}
                              >
                                {processingUser === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : user.verified ? (
                                  <UserX className="h-4 w-4" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                                <span>{user.verified ? 'Unverify' : 'Verify'}</span>
                              </button>
                            </>
                          ) : (
                            <div className='flex gap-3'>
                              <button
                                onClick={() => {
                                  user.verified ? unverifyUser(user.id) : verifyUser(user.id);
                                }}
                                disabled={processingUser === user.id}
                                className={`flex items-center space-x-1 ${user.verified ? 'text-red-600 hover:text-red-900' : 'text-blue-600 hover:text-blue-900'}`}
                              >
                                {processingUser === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <UserX className="h-4 w-4" />
                                )}
                                <span>{user.verified ? 'Unverify' : 'Verify'}</span>
                              </button>
                              {user.verified && (
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsDesignationModalOpen(true);
                                  }}
                                  className="text-white hover:text-blue-900 hover:bg-white border-2 py-1 px-2 border-blue-600 bg-blue-500 duration-300 rounded-2xl"
                                >
                                  Change <br /> Designation
                                </button>
                              )}
                              {user.verified && (
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsJoinDateModalOpen(true);
                                  }}
                                  className="text-white hover:text-purple-900 hover:bg-white border-2 py-1 px-2 border-purple-600 bg-purple-500 duration-300 rounded-2xl"
                                >
                                  Change <br /> Join Date
                                </button>
                              )}
                              {user.verified && (
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    toggleUserRole(user.id, user.role);
                                  }}
                                  className="text-white hover:text-purple-900 hover:bg-white border-2 py-1 px-1 border-purple-600 bg-purple-500 duration-300 rounded-2xl"
                                >
                                  {/* promote or demote like wise content for button */}
                                  {user.role === 'admin'? 'Demote' : 'Promote'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add both modals at the end of your JSX */}
      {selectedUser && (
        <>
          <ChangeDesignationModal
            isOpen={isDesignationModalOpen}
            onClose={() => {
              setIsDesignationModalOpen(false);
              setSelectedUser(null);
            }}
            userId={selectedUser.id}
            userEmail={selectedUser.email}
            currentDesignation={selectedUser.designation || ''}
            onDesignationChange={handleDesignationChange}
          />
          <ChangeJoinDateModal
            isOpen={isJoinDateModalOpen}
            onClose={() => {
              setIsJoinDateModalOpen(false);
              setSelectedUser(null);
            }}
            userId={selectedUser.id}
            currentJoinDate={selectedUser.createdAt}
            onJoinDateChange={handleJoinDateChange}
          />
        </>
      )}
    </div>
  );
}