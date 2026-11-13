import { createClient } from '@supabase/supabase-js';

export class ServiceError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function fail(error, fallback = 'No pudimos completar la operación.') {
  if (!error) return;
  if (error.status === 429) throw new ServiceError(429, 'RATE_LIMITED', 'Demasiados intentos. Intenta más tarde.');
  if (error.status >= 500 || error.name === 'AuthRetryableFetchError') {
    throw new ServiceError(503, 'SERVICE_UNAVAILABLE', 'El servicio no está disponible. Intenta más tarde.');
  }
  throw new ServiceError(400, 'AUTH_ERROR', fallback);
}

function sessionPayload(data) {
  if (!data.session || !data.user) throw new ServiceError(401, 'INVALID_SESSION', 'Vuelve a iniciar sesión.');
  return {
    user: { id: data.user.id, email: data.user.email },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      token_type: 'bearer',
    },
  };
}

export function createGateway(config, fetchImpl = globalThis.fetch) {
  const client = (token) => createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init = {}) => fetchImpl(input, {
        ...init,
        signal: init.signal
          ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)])
          : AbortSignal.timeout(10_000),
      }),
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    },
  });

  // Un cliente por operación: ninguna sesión se comparte entre usuarias.
  const useClient = async (token, operation) => {
    const supabase = client(token);
    try { return await operation(supabase); }
    finally { await supabase.auth.dispose(); }
  };

  return {
    async register({ name, email, password, account_type='learner', organization_name='' }) {
      return useClient(undefined, async (supabase) => {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { display_name: name, account_type, organization_name },
            emailRedirectTo: `${config.PUBLIC_API_URL.replace(/\/$/, '')}/auth/confirmed`,
          },
        });
        // Mismo resultado si el correo ya está registrado; no enumerar cuentas.
        if (error?.code === 'user_already_exists' || error?.code === 'email_exists') return;
        fail(error, 'No pudimos registrar la cuenta. Revisa el correo y los requisitos de contraseña.');
      });
    },
    async login(credentials) {
      return useClient(undefined, async (supabase) => {
        const { data, error } = await supabase.auth.signInWithPassword(credentials);
        if (error && error.status < 500 && error.status !== 429 && error.name !== 'AuthRetryableFetchError') {
          throw new ServiceError(401, 'INVALID_CREDENTIALS', 'Revisa tus credenciales y confirma tu correo.');
        }
        fail(error);
        return sessionPayload(data);
      });
    },
    async refresh(refreshToken) {
      return useClient(undefined, async (supabase) => {
        const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
        if (error && error.status < 500 && error.status !== 429 && error.name !== 'AuthRetryableFetchError') {
          throw new ServiceError(401, 'INVALID_SESSION', 'Vuelve a iniciar sesión.');
        }
        fail(error);
        return sessionPayload(data);
      });
    },
    async authenticate(token) {
      return useClient(undefined, async (supabase) => {
        const { data, error } = await supabase.auth.getUser(token);
        if (error?.status >= 500 || error?.name === 'AuthRetryableFetchError') fail(error);
        if (error?.status === 429) fail(error);
        if (error || !data.user?.email_confirmed_at) {
          throw new ServiceError(401, 'UNAUTHORIZED', 'Inicia sesión con un correo confirmado.');
        }
        return data.user;
      });
    },
    async logout(token) {
      return useClient(undefined, async (supabase) => {
        // Este endpoint usa el JWT de la usuaria; no necesita clave administrativa.
        const { error } = await supabase.auth.admin.signOut(token, 'local');
        fail(error);
      });
    },
    async getProfile(token, userId) {
      return useClient(token, async (supabase) => {
        const { data, error } = await supabase.from('profiles')
          .select('id, display_name, account_type, organization_name, created_at, updated_at').eq('id', userId).maybeSingle();
        if (error) throw new ServiceError(503, 'PROFILE_UNAVAILABLE', 'No pudimos consultar tu perfil.');
        if (!data) throw new ServiceError(404, 'PROFILE_NOT_FOUND', 'No encontramos tu perfil.');
        return data;
      });
    },
    async updateProfile(token, userId, name) {
      return useClient(token, async (supabase) => {
        const { data, error } = await supabase.from('profiles').update({ display_name: name })
          .eq('id', userId).select('id, display_name, account_type, organization_name, created_at, updated_at').maybeSingle();
        if (error) throw new ServiceError(503, 'PROFILE_UNAVAILABLE', 'No pudimos guardar tu perfil.');
        if (!data) throw new ServiceError(404, 'PROFILE_NOT_FOUND', 'No encontramos tu perfil.');
        return data;
      });
    },
    async getCommunityPosts(token, userId, mine=false) {
      return useClient(token, async supabase=>{
        let query=supabase.from('community_posts').select('id, organization_name, kind, title, description, deliverable, effort, compensation, level, mode, galaxies, skills, deadline, status, is_simulation, created_at');
        query=mine?query.eq('owner_id',userId):query.eq('status','open').gt('deadline',new Date().toISOString());
        const {data,error}=await query.order('created_at',{ascending:false}).limit(100);
        if(error)throw new ServiceError(503,'COMMUNITY_UNAVAILABLE','No pudimos cargar las publicaciones. Intenta otra vez.');
        return data;
      });
    },
    async getPractices(token,userId) {
      return useClient(token,async supabase=>{
        const {data,error}=await supabase.from('challenge_practices').select('post_id, completed_at, practiced_skills').eq('user_id',userId);
        if(error)throw new ServiceError(503,'PRACTICE_UNAVAILABLE','No pudimos cargar tus estrellas de práctica.');
        return data;
      });
    },
    async getPractice(token,userId,id) {
      return useClient(token,async supabase=>{
        const {data,error}=await supabase.from('challenge_practices').select('post_id, proposal, reflection, practiced_skills, completed_at').eq('user_id',userId).eq('post_id',id).maybeSingle();
        if(error)throw new ServiceError(503,'PRACTICE_UNAVAILABLE','No pudimos cargar tu práctica.');
        return data;
      });
    },
    async completePractice(token,id,body) {
      return useClient(token,async supabase=>{
        const {data,error}=await supabase.rpc('complete_challenge_practice',{p_post_id:id,p_proposal:body.proposal,p_reflection:body.reflection});
        if(error)throw new ServiceError(error.code==='PT409'?409:error.code==='42501'?403:503,'PRACTICE_UNAVAILABLE','No pudimos registrar tu práctica. Revisa si el reto sigue abierto y vuelve a intentarlo.');
        return data;
      });
    },
    async getSavedChallenges(token,userId) {
      return useClient(token,async supabase=>{
        const {data,error}=await supabase.from('challenge_saves').select('post_id').eq('user_id',userId);
        if(error)throw new ServiceError(503,'COMMUNITY_UNAVAILABLE','No pudimos cargar tus retos guardados.');
        return data.map(row=>row.post_id);
      });
    },
    async publishCommunityPost(token,body) {
      return useClient(token,async supabase=>{
        const {data,error}=await supabase.rpc('publish_community_post',{p_post:body}).single();
        if(error)throw new ServiceError(error.code==='42501'?403:503,'PUBLICATION_FAILED','No pudimos publicar. Revisa los datos y vuelve a intentarlo.');
        return data;
      });
    },
    async closeCommunityPost(token,id) {
      return useClient(token,async supabase=>{
        const {error}=await supabase.rpc('close_community_post',{p_id:id});
        if(error)throw new ServiceError(error.code==='PT404'?404:503,'PUBLICATION_FAILED','No pudimos cerrar esta publicación.');
      });
    },
    async saveChallenge(token,userId,id,save) {
      return useClient(token,async supabase=>{
        const {error}=save
          ?await supabase.from('challenge_saves').upsert({user_id:userId,post_id:id},{onConflict:'user_id,post_id',ignoreDuplicates:true})
          :await supabase.from('challenge_saves').delete().eq('user_id',userId).eq('post_id',id);
        if(error)throw new ServiceError(error.code==='42501'?403:503,'SAVE_FAILED','No pudimos cambiar el guardado. El reto puede estar cerrado o vencido.');
      });
    },
    async getDiscovery(token, userId) {
      return useClient(token, async (supabase) => {
        const { data, error } = await supabase.from('strength_discoveries')
          .select('version, revision, self_perception, answers, scores, reflection, completed_at, updated_at')
          .eq('user_id', userId).maybeSingle();
        if (error) throw new ServiceError(503, 'DISCOVERY_UNAVAILABLE', 'No pudimos cargar tu misión. Intenta de nuevo en un momento.');
        return data;
      });
    },
    async getInterests(token, userId) {
      return useClient(token, async (supabase) => {
        const { data, error } = await supabase.from('interest_profiles')
          .select('revision, updated_at, user_interests(interest_id)').eq('user_id', userId).maybeSingle();
        if (error) throw new ServiceError(503, 'INTERESTS_UNAVAILABLE', 'No pudimos cargar tus galaxias. Intenta otra vez.');
        return data ? { revision: data.revision, updated_at: data.updated_at, galaxies: data.user_interests.map(g => g.interest_id) } : null;
      });
    },
    async saveInterests(token, { revision, galaxies }) {
      return useClient(token, async (supabase) => {
        const { data, error } = await supabase.rpc('save_user_interests', { p_expected_revision: revision, p_galaxies: galaxies });
        if (['40001', 'PT409'].includes(error?.code)) throw new ServiceError(409, 'INTERESTS_CONFLICT', 'Tus galaxias cambiaron en otra pestaña. Recárgalas antes de guardar.');
        if (error) throw new ServiceError(503, 'INTERESTS_UNAVAILABLE', 'No pudimos guardar tus galaxias. Tu selección sigue aquí; intenta otra vez.');
        return data;
      });
    },
    async saveDiscovery(token, { revision, self_perception, answers, reflection }) {
      return useClient(token, async (supabase) => {
        const { data, error } = await supabase.rpc('save_strength_discovery', {
          p_expected_revision: revision, p_self_perception: self_perception, p_answers: answers, p_reflection: reflection,
        }).single();
        if (['40001', 'PT409'].includes(error?.code)) throw new ServiceError(409, 'DISCOVERY_CONFLICT', 'Tu misión cambió en otra pestaña. Recarga el progreso antes de continuar.');
        if (error) throw new ServiceError(503, 'DISCOVERY_UNAVAILABLE', 'No pudimos guardar tu misión. Tus elecciones siguen en esta pantalla; intenta otra vez.');
        return data;
      });
    },
  };
}
