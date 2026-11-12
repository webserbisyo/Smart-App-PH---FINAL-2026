import { Link } from '@tanstack/react-router';

/** Orders opened on the Calendar view (T85): the sidebar's sub-link under Orders. */
export function calendarLink() {
  return <Link to="/orders" search={{ view: 'bookings' }} preload="intent" />;
}
