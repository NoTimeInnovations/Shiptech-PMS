import { NavLink } from 'react-router-dom'
import { DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Settings() {
  return (
    <div className='min-h-screen p-4'>
      <h1 className='text-2xl font-heading font-semibold mb-1'>Settings</h1>
      <p className='text-muted-foreground mb-4'>Manage application configuration</p>
      <Card>
        <CardHeader>
          <CardTitle>Manage Links</CardTitle>
        </CardHeader>
        <CardContent>
          <NavLink
            to="/dashboard/currencies/"
            className={({ isActive }) =>
              `flex items-center gap-3 transition-all duration-500 rounded-xl px-3 py-3 ${isActive
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
              }`
            }
          >
            <DollarSign size={20} />
            <span>Currencies</span>
          </NavLink>
          {/* Add more links as needed */}
        </CardContent>
      </Card>
    </div>
  )
}
