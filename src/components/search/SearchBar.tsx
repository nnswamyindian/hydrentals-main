import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, MapPin, IndianRupee, Home } from 'lucide-react';
import { localities } from '@/data/mockProperties';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  variant?: 'hero' | 'compact';
  className?: string;
}

const SearchBar = ({ variant = 'hero', className }: SearchBarProps) => {
  const navigate = useNavigate();
  const [locality, setLocality] = useState('');
  const [budget, setBudget] = useState('');
  const [propertyType, setPropertyType] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (locality) params.set('locality', locality);
    if (budget) params.set('maxBudget', budget);
    if (propertyType) params.set('type', propertyType);
    navigate(`/properties?${params.toString()}`);
  };

  const budgetRanges = [
    { value: '10000', label: 'Under ₹10,000' },
    { value: '20000', label: 'Under ₹20,000' },
    { value: '30000', label: 'Under ₹30,000' },
    { value: '50000', label: 'Under ₹50,000' },
    { value: '100000', label: 'Under ₹1,00,000' },
  ];

  const propertyTypes = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'pg', label: 'PG' },
    { value: 'shared-room', label: 'Shared Room' },
    { value: 'co-living', label: 'Co-Living' },
    { value: 'house', label: 'House' },
    { value: 'villa', label: 'Villa' },
  ];

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by locality..."
            className="pl-9"
          />
        </div>
        <Button variant="default" size="icon">
          <Search className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-card rounded-2xl p-2 shadow-elevated",
      className
    )}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {/* Locality */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <Select value={locality} onValueChange={setLocality}>
            <SelectTrigger className="h-14 pl-16 border-0 bg-transparent text-left">
              <div className="flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Location</span>
                <SelectValue placeholder="Select locality" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {localities.map((loc) => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Budget */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
            <IndianRupee className="w-5 h-5 text-secondary" />
          </div>
          <Select value={budget} onValueChange={setBudget}>
            <SelectTrigger className="h-14 pl-16 border-0 bg-transparent text-left">
              <div className="flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Budget</span>
                <SelectValue placeholder="Max rent" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {budgetRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Property Type */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <Home className="w-5 h-5 text-accent-foreground" />
          </div>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="h-14 pl-16 border-0 bg-transparent text-left">
              <div className="flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Property</span>
                <SelectValue placeholder="All types" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {propertyTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Button */}
        <Button 
          onClick={handleSearch}
          variant="hero" 
          className="h-14 gap-2 text-base"
        >
          <Search className="w-5 h-5" />
          Search
        </Button>
      </div>
    </div>
  );
};

export default SearchBar;
