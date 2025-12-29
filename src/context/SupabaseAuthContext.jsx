import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SupabaseAuthContext = createContext();

export const useSupabaseAuth = () => {
    return useContext(SupabaseAuthContext);
};

export const SupabaseAuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [role, setRole] = useState(null); // 'Yönetici' | 'Mühendis' | null
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email);
            } else {
                setLoading(false);
            }
        });

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email);
            } else {
                setRole(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId, userEmail) => {
        try {
            // EMERGENCY: Force Admin for sumeyye@bugless.com
            const isSuperUser = userEmail === 'sumeyye@bugless.com';

            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();
            
            if (error) {
                console.error('Error fetching profile:', error);
                // Create profile for ANY user if missing
                try {
                    console.log('Creating missing profile for user...');
                    const fullName = userEmail?.split('@')[0] || 'Kullanıcı';
                    
                    const initialRole = isSuperUser ? 'Admin' : 'Mühendis';
                    
                    await supabase.from('profiles').upsert({
                        id: userId,
                        full_name: fullName,
                        email: userEmail,
                        role: initialRole
                    });
                    
                    setRole(initialRole);
                } catch (upsertErr) {
                    console.error('Upsert failed', upsertErr);
                    setRole('Mühendis');
                }
            } else {
                // If special user, force Admin regardless of DB (in case someone changed it)
                setRole(isSuperUser ? 'Admin' : (data?.role || 'Mühendis'));
            }
        } catch (err) {
            console.error('Profile fetch exception:', err);
            setRole(userEmail === 'sumeyye@bugless.com' ? 'Admin' : 'Mühendis');
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setRole(null);
        setUser(null);
        setSession(null);
    };

    const value = {
        session,
        user,
        role,
        loading,
        signOut,
        isAdmin: role === 'Admin' || (user && user.email === 'sumeyye@bugless.com'),
        isManager: role === 'Admin' || role === 'Yönetici' || (user && user.email === 'sumeyye@bugless.com'),
        isEngineer: role === 'Mühendis' && (!user || user.email !== 'sumeyye@bugless.com')
    };

    return (
        <SupabaseAuthContext.Provider value={value}>
            {!loading && children}
        </SupabaseAuthContext.Provider>
    );
};
