export type CarCategory = "economy" | "suv" | "4x4" | "luxury";
export type CarStatus = "available" | "maintenance" | "retired";

export type Car = {
  id: string;
  name: string;
  plate: string;
  category: CarCategory;
  cls: string; // e.g. "Compact SUV", shown under the name on the website
  seats: number;
  gear: "Automatic" | "Manual";
  fuel: "Petrol" | "Diesel" | "Hybrid" | "Electric";
  bags: number;
  pricePerDay: number;
  image: string; // path in /public or an uploaded data URL
  tag?: string;
  status: CarStatus;
  showOnSite: boolean;
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  licence: string;
  dayRate: number;
  active: boolean;
};

export type BookingStatus = "booked" | "completed" | "cancelled";

export type Booking = {
  id: string;
  customer: string;
  phone: string;
  carId: string;
  start: string; // YYYY-MM-DD
  end: string;
  dailyRate: number;
  status: BookingStatus;
  paid: boolean;
  notes?: string;
};

// A driver hired with one of the fleet's cars. Separate from bookings, which are
// self-drive rentals; the two only share the cars.
export type DriverJob = {
  id: string;
  driverId: string;
  carId?: string; // empty only on older records
  date: string;
  type: string;
  pickup?: string;
  pickupTime?: string; // HH:MM
  customer: string;
  phone?: string;
  amount: number;
  paid: boolean;
  notes?: string;
};

export type CostCategory = "fuel" | "repair" | "other";

export type Cost = {
  id: string;
  date: string;
  category: CostCategory;
  carId?: string;
  description: string;
  amount: number;
};

export type Collections = {
  cars: Car;
  drivers: Driver;
  bookings: Booking;
  jobs: DriverJob;
  costs: Cost;
};
