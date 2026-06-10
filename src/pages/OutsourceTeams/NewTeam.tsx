import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOutsourceTeamStore } from '@/store/outsourceTeamStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';

export default function NewTeam() {
  const navigate = useNavigate();
  const { addTeam } = useOutsourceTeamStore();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    gst: '',
    contactPersons: [{ name: '', phone: '' }],
    billingAddress: '',
    isBillingAddressSame: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTeam(formData);
    navigate('/dashboard/outsource-teams');
  };

  const addContactPerson = () => {
    setFormData(prev => ({
      ...prev,
      contactPersons: [...prev.contactPersons, { name: '', phone: '' }]
    }));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-heading font-semibold mb-1">Add New Outsource Team</h1>
      <p className="text-muted-foreground mb-6">Register a new external team</p>
      <Card className="max-w-2xl">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
    
            <div className="space-y-2">
              <Label htmlFor="team-address">Address</Label>
              <Textarea
                id="team-address"
                value={formData.address}
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                required
              />
            </div>
    
            <div className="space-y-2">
              <Label htmlFor="team-gst">GST Number</Label>
              <Input
                id="team-gst"
                type="text"
                value={formData.gst}
                onChange={e => setFormData(prev => ({ ...prev, gst: e.target.value }))}
              />
            </div>
    
            <div className="space-y-2">
              <Label>Contact Persons</Label>
              {formData.contactPersons.map((person, index) => (
                <div key={index} className="flex gap-4 mb-4">
                  <Input
                    type="text"
                    placeholder="Name"
                    value={person.name}
                    onChange={e => {
                      const newContactPersons = [...formData.contactPersons];
                      newContactPersons[index].name = e.target.value;
                      setFormData(prev => ({ ...prev, contactPersons: newContactPersons }));
                    }}
                    required
                  />
                  <Input
                    type="tel"
                    placeholder="Phone"
                    value={person.phone}
                    onChange={e => {
                      const newContactPersons = [...formData.contactPersons];
                      newContactPersons[index].phone = e.target.value;
                      setFormData(prev => ({ ...prev, contactPersons: newContactPersons }));
                    }}
                    required
                  />
                </div>
              ))}
              <Button type="button" variant="link" className="px-0" onClick={addContactPerson}>
                + Add Contact Person
              </Button>
            </div>
    
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="billing-same"
                  checked={formData.isBillingAddressSame}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    setFormData(prev => ({
                      ...prev,
                      isBillingAddressSame: isChecked,
                      billingAddress: isChecked ? prev.address : ''
                    }));
                  }}
                />
                <Label htmlFor="billing-same">Billing Address same as Address</Label>
              </div>
              {!formData.isBillingAddressSame && (
                <Textarea
                  value={formData.billingAddress}
                  onChange={e => setFormData(prev => ({ ...prev, billingAddress: e.target.value }))}
                  required
                />
              )}
            </div>
    
            <Button type="submit">Add Team</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
