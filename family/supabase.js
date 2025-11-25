// ===== Supabase Configuration & Database Service =====

const SUPABASE_URL = 'https://bmgzgbmromjsdamfhbpy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtZ3pnYm1yb21qc2RhbWZoYnB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMjM2OTMsImV4cCI6MjA3OTU5OTY5M30.O02o-F8vieZJU_eD2DDHG0Uf-_5YBaIKzkkv6FAh4do';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Database Service Object =====
const db = {
    // ==================== FAMILY MEMBERS ====================
    async getFamilyMembers() {
        const { data, error } = await supabase
            .from('family_members')
            .select('*')
            .order('name');
        if (error) throw error;
        return data;
    },

    async getMemberByName(name) {
        const { data, error } = await supabase
            .from('family_members')
            .select('*')
            .eq('name', name.toLowerCase())
            .single();
        if (error) throw error;
        return data;
    },

    async verifyPin(memberId, pin) {
        const { data, error } = await supabase
            .from('family_members')
            .select('*')
            .eq('id', memberId)
            .eq('pin_code', pin)
            .single();
        if (error) return null;
        return data;
    },

    async updateMemberStatus(memberId, status, emoji) {
        const { data, error } = await supabase
            .from('family_members')
            .update({ status, status_emoji: emoji })
            .eq('id', memberId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // ==================== EVENTS ====================
    async getEvents() {
        const { data, error } = await supabase
            .from('events')
            .select(`
                *,
                created_by_member:family_members!events_created_by_fkey(id, display_name, avatar_letter, color)
            `)
            .order('event_date', { ascending: true });
        if (error) throw error;
        return data;
    },

    async getEventsForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('events')
            .select(`
                *,
                created_by_member:family_members!events_created_by_fkey(id, display_name, avatar_letter, color)
            `)
            .eq('event_date', dateStr)
            .order('event_time', { ascending: true });
        if (error) throw error;
        return data;
    },

    async getUpcomingEvents(limit = 5) {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('events')
            .select(`
                *,
                created_by_member:family_members!events_created_by_fkey(id, display_name, avatar_letter, color)
            `)
            .gte('event_date', today)
            .order('event_date', { ascending: true })
            .order('event_time', { ascending: true })
            .limit(limit);
        if (error) throw error;
        return data;
    },

    async createEvent(event) {
        const { data, error } = await supabase
            .from('events')
            .insert(event)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteEvent(eventId) {
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);
        if (error) throw error;
    },

    // ==================== EVENT RSVPs ====================
    async getRSVPsForEvent(eventId) {
        const { data, error } = await supabase
            .from('event_rsvps')
            .select(`
                *,
                member:family_members(id, display_name, avatar_letter, color)
            `)
            .eq('event_id', eventId);
        if (error) throw error;
        return data;
    },

    async setRSVP(eventId, memberId, status) {
        const { data, error } = await supabase
            .from('event_rsvps')
            .upsert({
                event_id: eventId,
                member_id: memberId,
                status: status,
                responded_at: new Date().toISOString()
            }, {
                onConflict: 'event_id,member_id'
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async createEventInvites(eventId, memberIds) {
        const invites = memberIds.map(memberId => ({
            event_id: eventId,
            member_id: memberId,
            status: 'pending'
        }));
        const { data, error } = await supabase
            .from('event_rsvps')
            .insert(invites)
            .select();
        if (error) throw error;
        return data;
    },

    // ==================== TODO LISTS ====================
    async getTodoLists() {
        const { data, error } = await supabase
            .from('todo_lists')
            .select('*')
            .order('created_at');
        if (error) throw error;
        return data;
    },

    async createTodoList(name, emoji = '📋', createdBy = null) {
        const { data, error } = await supabase
            .from('todo_lists')
            .insert({ name, emoji, created_by: createdBy })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // ==================== TODO ITEMS ====================
    async getTodoItems(listId = null) {
        let query = supabase
            .from('todo_items')
            .select(`
                *,
                assigned_to_member:family_members!todo_items_assigned_to_fkey(id, display_name, avatar_letter, color),
                created_by_member:family_members!todo_items_created_by_fkey(id, display_name)
            `)
            .order('completed', { ascending: true })
            .order('priority', { ascending: false })
            .order('created_at', { ascending: false });
        
        if (listId) {
            query = query.eq('list_id', listId);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async createTodoItem(item) {
        const { data, error } = await supabase
            .from('todo_items')
            .insert(item)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateTodoItem(itemId, updates) {
        const { data, error } = await supabase
            .from('todo_items')
            .update(updates)
            .eq('id', itemId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async toggleTodoItem(itemId, completed) {
        const updates = {
            completed,
            completed_at: completed ? new Date().toISOString() : null
        };
        return this.updateTodoItem(itemId, updates);
    },

    async deleteTodoItem(itemId) {
        const { error } = await supabase
            .from('todo_items')
            .delete()
            .eq('id', itemId);
        if (error) throw error;
    },

    // ==================== SHOPPING LISTS ====================
    async getShoppingLists() {
        const { data, error } = await supabase
            .from('shopping_lists')
            .select('*')
            .order('is_featured', { ascending: false })
            .order('created_at');
        if (error) throw error;
        return data;
    },

    async createShoppingList(name, emoji = '🛒', isFeatured = false, createdBy = null) {
        const { data, error } = await supabase
            .from('shopping_lists')
            .insert({ name, emoji, is_featured: isFeatured, created_by: createdBy })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // ==================== SHOPPING ITEMS ====================
    async getShoppingItems(listId) {
        const { data, error } = await supabase
            .from('shopping_items')
            .select(`
                *,
                added_by_member:family_members!shopping_items_added_by_fkey(id, display_name)
            `)
            .eq('list_id', listId)
            .order('checked', { ascending: true })
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async createShoppingItem(listId, name, addedBy = null) {
        const { data, error } = await supabase
            .from('shopping_items')
            .insert({ list_id: listId, name, added_by: addedBy })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async toggleShoppingItem(itemId, checked) {
        const { data, error } = await supabase
            .from('shopping_items')
            .update({ checked })
            .eq('id', itemId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteShoppingItem(itemId) {
        const { error } = await supabase
            .from('shopping_items')
            .delete()
            .eq('id', itemId);
        if (error) throw error;
    },

    // ==================== ANNOUNCEMENTS ====================
    async getAnnouncements() {
        const { data, error } = await supabase
            .from('announcements')
            .select(`
                *,
                author:family_members!announcements_author_id_fkey(id, display_name, avatar_letter, color)
            `)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async createAnnouncement(announcement) {
        const { data, error } = await supabase
            .from('announcements')
            .insert(announcement)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async toggleAnnouncementPin(announcementId, isPinned) {
        const { data, error } = await supabase
            .from('announcements')
            .update({ is_pinned: isPinned })
            .eq('id', announcementId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteAnnouncement(announcementId) {
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', announcementId);
        if (error) throw error;
    },

    // ==================== ANNOUNCEMENT REACTIONS ====================
    async getReactionsForAnnouncement(announcementId) {
        const { data, error } = await supabase
            .from('announcement_reactions')
            .select(`
                *,
                member:family_members(id, display_name)
            `)
            .eq('announcement_id', announcementId);
        if (error) throw error;
        return data;
    },

    async toggleReaction(announcementId, memberId, emoji) {
        // Check if reaction exists
        const { data: existing } = await supabase
            .from('announcement_reactions')
            .select('id')
            .eq('announcement_id', announcementId)
            .eq('member_id', memberId)
            .eq('emoji', emoji)
            .single();

        if (existing) {
            // Remove reaction
            const { error } = await supabase
                .from('announcement_reactions')
                .delete()
                .eq('id', existing.id);
            if (error) throw error;
            return null;
        } else {
            // Add reaction
            const { data, error } = await supabase
                .from('announcement_reactions')
                .insert({ announcement_id: announcementId, member_id: memberId, emoji })
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    // ==================== ANNOUNCEMENT COMMENTS ====================
    async getCommentsForAnnouncement(announcementId) {
        const { data, error } = await supabase
            .from('announcement_comments')
            .select(`
                *,
                author:family_members!announcement_comments_author_id_fkey(id, display_name, avatar_letter, color)
            `)
            .eq('announcement_id', announcementId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    },

    async createComment(announcementId, authorId, content) {
        const { data, error } = await supabase
            .from('announcement_comments')
            .insert({ announcement_id: announcementId, author_id: authorId, content })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // ==================== MEALS ====================
    async getMealsForWeek(startDate) {
        const start = new Date(startDate);
        const end = new Date(startDate);
        end.setDate(end.getDate() + 6);
        
        const { data, error } = await supabase
            .from('meals')
            .select(`
                *,
                chef:family_members!meals_chef_id_fkey(id, display_name, avatar_letter, color)
            `)
            .gte('meal_date', start.toISOString().split('T')[0])
            .lte('meal_date', end.toISOString().split('T')[0])
            .order('meal_date')
            .order('meal_type');
        if (error) throw error;
        return data;
    },

    async setMeal(mealDate, mealType, name, chefId = null, notes = null) {
        const { data, error } = await supabase
            .from('meals')
            .upsert({
                meal_date: mealDate,
                meal_type: mealType,
                name,
                chef_id: chefId,
                notes
            }, {
                onConflict: 'meal_date,meal_type'
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteMeal(mealId) {
        const { error } = await supabase
            .from('meals')
            .delete()
            .eq('id', mealId);
        if (error) throw error;
    },

    // ==================== REALTIME SUBSCRIPTIONS ====================
    subscribeToTable(table, callback) {
        return supabase
            .channel(`${table}_changes`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: table },
                (payload) => callback(payload)
            )
            .subscribe();
    },

    unsubscribe(subscription) {
        supabase.removeChannel(subscription);
    }
};

// Export for use in other files
window.db = db;
window.supabase = supabase;
