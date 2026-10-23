'use client';

import { useEffect, useState } from 'react';
import { loginAdmin, logoutAdmin, subscribeAdminSession } from '../../public/admin-session.js';

export function useAdminSession() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => subscribeAdminSession(setIsAdmin), []);
  return { isAdmin, loginAdmin, logoutAdmin };
}
