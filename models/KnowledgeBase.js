const { supabase } = require('../config/db');

class KnowledgeBase {
  static async getAll(search = '', categoryId = null, isPublished = true) {
    let query = supabase
      .from('knowledge_base')
      .select(`
        id, title, view_count, tags, is_published, created_at, updated_at,
        kb_categories!knowledge_base_category_id_fkey ( id, name )
      `)
      .order('created_at', { ascending: false });

    if (isPublished !== null) {
      query = query.eq('is_published', isPublished);
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(kb => {
      const { kb_categories: cat, ...article } = kb;
      return { ...article, category_name: cat?.name, category_id: cat?.id };
    });
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select(`
        *,
        kb_categories!knowledge_base_category_id_fkey ( name ),
        users!knowledge_base_created_by_fkey ( full_name )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const { kb_categories: cat, users: author, ...article } = data;
    return { ...article, category_name: cat?.name, author_name: author?.full_name };
  }

  static async create(data, userId) {
    const { title, content, category_id, tags, is_published } = data;
    const { data: article, error } = await supabase
      .from('knowledge_base')
      .insert({ title, content, category_id, tags, is_published, created_by: userId })
      .select()
      .single();

    if (error) throw error;
    return article;
  }

  static async incrementViewCount(id) {
    // Supabase doesn't support atomic increment via JS client directly, use RPC or read-modify-write
    const { data: current } = await supabase
      .from('knowledge_base')
      .select('view_count')
      .eq('id', id)
      .single();

    if (current) {
      await supabase
        .from('knowledge_base')
        .update({ view_count: (current.view_count || 0) + 1 })
        .eq('id', id);
    }
  }

  static async getCategories() {
    const { data, error } = await supabase
      .from('kb_categories')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }
}

module.exports = KnowledgeBase;
