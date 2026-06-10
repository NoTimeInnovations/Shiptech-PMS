import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Users, UserCheck, Loader2, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import ChangeDesignationModal from '../components/ChangeDesignationModal';
import ChangeJoinDateModal from '../components/ChangeJoinDateModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
    <div className="min-h-screen bg-background py-8 watermark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="overflow-hidden py-0 gap-0">
          {/* Header */}
          <div className="border-b border-border px-6 py-4">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'all' | 'unverified' | 'customers')}
            >
              <TabsList>
                <TabsTrigger value="all" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span>All Members ({users.filter(u => u.verified).length})</span>
                </TabsTrigger>
                <TabsTrigger value="unverified" className="gap-2">
                  <UserCheck className="h-4 w-4" />
                  <span>Unverified ({users.filter(u => !u.verified).length})</span>
                </TabsTrigger>
                <TabsTrigger value="customers" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span>Customers ({customers.length})</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Content */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Name</TableHead>
                    <TableHead className="text-center">Email</TableHead>
                    {activeTab !== 'customers' && (
                      <TableHead className="text-center">Designation</TableHead>
                    )}
                    <TableHead className="text-center">Role</TableHead>
                    {activeTab === 'customers' && (
                      <TableHead className="text-center">Status</TableHead>
                    )}
                    <TableHead className="text-center">Joined</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(activeTab === 'customers' ? displayedCustomers : displayedUsers).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-center font-medium">
                        {user.fullName}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {user.email}
                      </TableCell>
                      {activeTab !== 'customers' && (
                        <TableCell className="text-center text-muted-foreground">
                          {user.designation ?? "User"}
                        </TableCell>
                      )}
                      <TableCell className="text-center text-muted-foreground">
                        {user.role}
                      </TableCell>
                      {activeTab === 'customers' && (
                        <TableCell className="text-center">
                          <Badge variant={user.verified ? 'secondary' : 'outline'}>
                            {user.verified ? 'Verified' : 'Unverified'}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-center text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          {activeTab === 'customers' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                user.verified ? unverifyUser(user.id) : verifyUser(user.id);
                              }}
                              disabled={processingUser === user.id}
                              className={user.verified ? 'text-destructive hover:text-destructive' : 'text-blue-600 hover:text-blue-700'}
                            >
                              {processingUser === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : user.verified ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                              <span>{user.verified ? 'Unverify' : 'Verify'}</span>
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  user.verified ? unverifyUser(user.id) : verifyUser(user.id);
                                }}
                                disabled={processingUser === user.id}
                                className={user.verified ? 'text-destructive hover:text-destructive' : 'text-blue-600 hover:text-blue-700'}
                              >
                                {processingUser === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <UserX className="h-4 w-4" />
                                )}
                                <span>{user.verified ? 'Unverify' : 'Verify'}</span>
                              </Button>
                              {user.verified && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsDesignationModalOpen(true);
                                  }}
                                >
                                  Change Designation
                                </Button>
                              )}
                              {user.verified && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsJoinDateModalOpen(true);
                                  }}
                                >
                                  Change Join Date
                                </Button>
                              )}
                              {user.verified && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    toggleUserRole(user.id, user.role);
                                  }}
                                >
                                  {user.role === 'admin' ? 'Demote' : 'Promote'}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
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
