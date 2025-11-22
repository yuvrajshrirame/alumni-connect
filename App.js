import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar, 
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  Share,
  BackHandler,
  Linking,
  FlatList 
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';

// --- 1. FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  updateProfile,
  updateEmail,
  updatePassword 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc, 
  limit,
  orderBy,
  getDoc,
  setDoc,
  increment,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

// --- 2. FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("Firebase initialization failed.");
}

// --- 3. MAIN APP COMPONENT ---
export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [user, setUser] = useState(null); 
  const [isLoginView, setIsLoginView] = useState(true); 
  const [isLoading, setIsLoading] = useState(false); 
  const [isOnboarding, setIsOnboarding] = useState(false);

  // Navigation & Data State
  const [currentTab, setCurrentTab] = useState('home');
  const [selectedAlum, setSelectedAlum] = useState(null);
  const [activeChatRequest, setActiveChatRequest] = useState(null); 
  
  // Data Lists
  const [myRequests, setMyRequests] = useState([]); 
  const [incomingRequests, setIncomingRequests] = useState([]); 
  const [alumniList, setAlumniList] = useState([]); 
  const [feedPosts, setFeedPosts] = useState([]);
  
  // Screen Modes
  const [isEditingProfile, setIsEditingProfile] = useState(false); 

  // --- BACK HANDLER LOGIC ---
  useEffect(() => {
    const backAction = () => {
      if (activeChatRequest) { setActiveChatRequest(null); return true; }
      if (selectedAlum) { setSelectedAlum(null); return true; }
      if (isEditingProfile) { setIsEditingProfile(false); return true; }
      if (currentTab !== 'home') { setCurrentTab('home'); return true; }
      return false; 
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [currentTab, selectedAlum, isEditingProfile, activeChatRequest]);

  // --- APP LAUNCH & AUTH LISTENER ---
  useEffect(() => {
    setTimeout(() => setIsSplashVisible(false), 2000);
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
            const userDocRef = doc(db, "users", currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                setUser({ ...data, uid: currentUser.uid });
                fetchInitialData(currentUser.uid, data.role);
                setIsOnboarding(false);
            } else {
                setIsOnboarding(true);
                setUser({ uid: currentUser.uid, email: currentUser.email, name: currentUser.displayName });
            }
        } catch (e) { console.log("Auth check error", e); }
      } else {
        setUser(null);
        setIsOnboarding(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchInitialData = (uid, role) => {
    fetchRequests(uid, role);
    fetchFeed();
  };

  // --- DATA FETCHING ---
  const fetchAlumni = async () => {
    if (!db) return;
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "alumni"));
      const list = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.name || !data.uid) return; 
        if (user && data.uid === user.uid) return;
        if (data.role !== 'Alumni') return;
        list.push({ id: doc.id, ...data });
      });
      setAlumniList(list);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const fetchRequests = async (userId, role) => {
    if (!db) return;
    try {
      const fieldToQuery = role === 'Alumni' ? 'mentorId' : 'senderId';
      const q = query(collection(db, "requests"), where(fieldToQuery, "==", userId));
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const reqs = [];
        querySnapshot.forEach((doc) => reqs.push({ id: doc.id, ...doc.data() }));
        if (role === 'Alumni') setIncomingRequests(reqs);
        else setMyRequests(reqs);
      });
      return unsubscribe;
    } catch (e) { console.log(e); }
  };

  const fetchFeed = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, "posts"), limit(50));
      const querySnapshot = await getDocs(q);
      const posts = [];
      querySnapshot.forEach((doc) => posts.push({ id: doc.id, ...doc.data() }));
      
      // FIX: Sort by LIKES descending
      posts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      setFeedPosts(posts);
    } catch (e) { console.log("Feed error", e); }
  };

  // --- ACTIONS ---
  const handleLogin = async (email, password) => {
    setIsLoading(true);
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (error) { Alert.alert("Login Failed", error.message); setIsLoading(false); }
  };

  const handleSignup = async (email, password) => {
    setIsLoading(true);
    try { await createUserWithEmailAndPassword(auth, email, password); } 
    catch (error) { Alert.alert("Signup Failed", error.message); setIsLoading(false); }
  };

  const handleOnboardingComplete = async (name, role, bio, company, experience, batch) => {
    setIsLoading(true);
    try {
      const currentUser = auth.currentUser;
      await updateProfile(currentUser, { displayName: name, photoURL: role });
      
      const stats = { rating: 0.0, ratingCount: 0, sessions: 0, experience: experience || 0 };

      const userData = {
        name, email: currentUser.email, role, bio, 
        company: company || 'N/A',
        batch: batch || new Date().getFullYear().toString(),
        uid: currentUser.uid,
        experience: experience || 0,
        stats: stats,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, "users", currentUser.uid), userData);

      if (role === 'Alumni') {
        await setDoc(doc(db, "alumni", currentUser.uid), {
            ...userData,
            available: true, 
            skills: ['Mentorship']
        });
      }
      
      setUser(userData);
      setIsOnboarding(false);
    } catch (error) { Alert.alert("Error", error.message); }
    setIsLoading(false);
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: async () => {
          await signOut(auth);
          setIsOnboarding(false);
          setUser(null);
          setCurrentTab('home');
          setMyRequests([]);
          setIncomingRequests([]);
          setAlumniList([]);
      }}
    ]);
  };

  const handleUpdateProfile = async (newName, newEmail, newPassword, newBio, newCompany) => {
    if(!auth.currentUser) return;
    setIsLoading(true);
    try {
      if (newName !== user.name) await updateProfile(auth.currentUser, { displayName: newName });
      if (newEmail && newEmail !== user.email) await updateEmail(auth.currentUser, newEmail);
      if (newPassword && newPassword.length > 0) await updatePassword(auth.currentUser, newPassword);

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { name: newName, bio: newBio, company: newCompany });

      if (user.role === 'Alumni') {
          const alumRef = doc(db, "alumni", user.uid);
          await updateDoc(alumRef, { name: newName, bio: newBio, company: newCompany });
      }

      setUser({ ...user, name: newName, email: newEmail || user.email, bio: newBio, company: newCompany });
      setIsEditingProfile(false);
      Alert.alert("Success", "Profile updated.");
    } catch (error) { Alert.alert("Error", error.message); }
    setIsLoading(false);
  };

  // --- FEED ACTIONS ---
  const handlePostSubmit = async (content) => {
    if (!content.trim()) return;
    try {
      await addDoc(collection(db, "posts"), {
        author: user.name, authorRole: user.role, authorCompany: user.company,
        content: content, date: new Date().toLocaleDateString(), 
        createdAt: serverTimestamp(), likedBy: [], comments: []
      });
      fetchFeed(); 
      Alert.alert("Posted", "Shared to community.");
    } catch(e) { Alert.alert("Error", e.message); }
  };

  const handleLikePost = async (post) => {
      try {
          const postRef = doc(db, "posts", post.id);
          const isLiked = post.likedBy && post.likedBy.includes(user.uid);
          if (isLiked) {
             await updateDoc(postRef, { likedBy: arrayRemove(user.uid) });
          } else {
             await updateDoc(postRef, { likedBy: arrayUnion(user.uid) });
          }
          fetchFeed();
      } catch (e) { console.log("Like error", e); }
  };

  const handleCommentPost = async (postId, commentText, parentId = null) => {
      if (!commentText.trim()) return;
      try {
          const postRef = doc(db, "posts", postId);
          const postSnap = await getDoc(postRef);
          const postData = postSnap.data();
          let updatedComments = postData.comments || [];

          const newComment = {
              id: Date.now().toString(),
              user: user.name,
              text: commentText,
              role: user.role,
              replies: []
          };

          if (parentId) {
              updatedComments = updatedComments.map(c => {
                  if (c.id === parentId) {
                      return { ...c, replies: [...(c.replies || []), newComment] };
                  }
                  return c;
              });
          } else {
              updatedComments.push(newComment);
          }

          await updateDoc(postRef, { comments: updatedComments });
          fetchFeed(); 
      } catch (e) { Alert.alert("Error", "Could not comment."); }
  };

  // --- MENTOR ACTIONS ---
  const sendRequest = async (alum, message) => {
    if (!user || !db) return;
    try {
      await addDoc(collection(db, "requests"), {
        senderId: user.uid, senderName: user.name,
        mentorId: alum.uid, mentorName: alum.name,
        status: 'Pending', date: new Date().toLocaleDateString(),
        message: message, 
        mentorEmail: alum.email 
      });
      Alert.alert("Request Sent", "Track status in Requests tab.");
      setSelectedAlum(null); 
      setCurrentTab('requests'); 
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const handleRateMentor = async (alum, rating) => {
    try {
        const alumRef = doc(db, "alumni", alum.id);
        const alumSnap = await getDoc(alumRef);
        const currentStats = alumSnap.data().stats || { rating: 0, ratingCount: 0, experience: 0 };
        
        const oldRating = currentStats.rating || 0;
        const oldCount = currentStats.ratingCount || 0;
        const newCount = oldCount + 1;
        const newRating = ((oldRating * oldCount) + rating) / newCount;

        const updatedStats = { 
            ...currentStats, 
            rating: parseFloat(newRating.toFixed(1)), 
            ratingCount: newCount 
        };

        await updateDoc(alumRef, { stats: updatedStats });
        Alert.alert("Success", `You rated ${alum.name} ${rating} stars.`);
        setSelectedAlum({ ...alum, stats: updatedStats });
    } catch (e) { Alert.alert("Error", "Could not submit rating."); }
  };

  const handleRequestAction = async (reqId, newStatus) => {
    try {
      const reqRef = doc(db, "requests", reqId);
      await updateDoc(reqRef, { status: newStatus });
    } catch (e) { Alert.alert("Error", "Could not update."); }
  };

  // --- UI RENDERERS ---
  if (isSplashVisible) return <SplashScreen />;

  if (isOnboarding && user) {
      return (
        <View style={styles.webBackground}>
            <View style={styles.webContainer}>
                <OnboardingScreen onComplete={handleOnboardingComplete} />
            </View>
        </View>
      );
  }

  if (!user) {
    return (
      <View style={styles.webBackground}>
        <View style={styles.webContainer}>
             <AuthScreen 
               isLogin={isLoginView} 
               onToggle={() => setIsLoginView(!isLoginView)} 
               onLogin={handleLogin}
               onSignup={handleSignup}
               loading={isLoading}
             />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mainSafeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.webBackground}>
        <View style={styles.webContainer}>
          
          {!selectedAlum && !isEditingProfile && !activeChatRequest && (
            <View style={styles.headerBar}>
              <Text style={styles.headerTitle}>
                {currentTab === 'home' ? 'Community' : 
                 currentTab === 'mentors' ? 'Directory' : 
                 currentTab === 'requests' ? 'Inbox' : 'Profile'}
              </Text>
              <TouchableOpacity onPress={() => setCurrentTab('profile')}>
                <Avatar size={36} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.contentArea}>
            {activeChatRequest ? (
              <ChatScreen 
                request={activeChatRequest}
                currentUser={user}
                onBack={() => setActiveChatRequest(null)}
              />
            ) : selectedAlum ? (
              <DetailScreen 
                alum={selectedAlum} 
                currentUserUid={user.uid}
                onBack={() => setSelectedAlum(null)}
                onConnect={sendRequest}
                onRate={handleRateMentor}
              />
            ) : isEditingProfile ? (
              <EditProfileScreen 
                user={user} 
                onCancel={() => setIsEditingProfile(false)}
                onSave={handleUpdateProfile}
              />
            ) : (
              <>
                {currentTab === 'home' && (
                  <FeedScreen 
                    posts={feedPosts} 
                    user={user} 
                    onRefresh={fetchFeed}
                    onPost={handlePostSubmit}
                    onLike={handleLikePost}
                    onComment={handleCommentPost}
                  />
                )}
                {currentTab === 'mentors' && (
                  <MentorsScreen 
                    alumni={alumniList} 
                    onSelect={setSelectedAlum} 
                    onRefresh={fetchAlumni} 
                  />
                )}
                {currentTab === 'requests' && (
                  <RequestsScreen 
                    requests={user.role === 'Alumni' ? incomingRequests : myRequests} 
                    isAlumni={user.role === 'Alumni'}
                    onAction={handleRequestAction}
                    onChat={(req) => setActiveChatRequest(req)}
                  />
                )}
                {currentTab === 'profile' && (
                  <ProfileScreen 
                    user={user} 
                    onLogout={handleLogout} 
                    onEdit={() => setIsEditingProfile(true)}
                  />
                )}
              </>
            )}
          </View>

          {!selectedAlum && !isEditingProfile && !activeChatRequest && (
            <View style={styles.bottomNavWrapper}>
              <View style={styles.bottomNav}>
                <TabItem icon="home" label="Feed" active={currentTab === 'home'} onPress={() => setCurrentTab('home')} />
                <TabItem icon="search" label="Mentors" active={currentTab === 'mentors'} onPress={() => { setCurrentTab('mentors'); fetchAlumni(); }} />
                <TabItem icon="list-alt" label="Requests" active={currentTab === 'requests'} onPress={() => setCurrentTab('requests')} />
                <TabItem icon="person" label="Profile" active={currentTab === 'profile'} onPress={() => setCurrentTab('profile')} />
              </View>
            </View>
          )}

        </View>
      </View>
    </SafeAreaView>
  );
}

// --- SCREEN COMPONENTS ---

const ChatScreen = ({ request, currentUser, onBack }) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef();

    const otherPersonName = currentUser.uid === request.senderId ? request.mentorName : request.senderName;

    useEffect(() => {
        const q = query(collection(db, "requests", request.id, "messages"), orderBy("createdAt", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = [];
            snapshot.forEach(doc => msgs.push({id: doc.id, ...doc.data()}));
            setMessages(msgs);
        });
        return unsubscribe;
    }, [request.id]);

    const sendMessage = async () => {
        if(!inputText.trim()) return;
        try {
            await addDoc(collection(db, "requests", request.id, "messages"), {
                text: inputText,
                senderId: currentUser.uid,
                createdAt: serverTimestamp()
            });
            setInputText('');
        } catch(e) { Alert.alert("Error", "Failed to send."); }
    };

    return (
        <KeyboardAvoidingView 
            style={{flex:1}} 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
            <View style={styles.screenContainer}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
                    {/* FIX: Show Other Person's Name */}
                    <Text style={styles.headerTitle}>{otherPersonName}</Text>
                    <View style={{width: 24}} />
                </View>
                <FlatList 
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                    renderItem={({item}) => {
                        const isMe = item.senderId === currentUser.uid;
                        return (
                            <View style={[
                                styles.msgBubble, 
                                // FIX: Distinct styles
                                isMe ? styles.msgMe : styles.msgOther
                            ]}>
                                <Text style={[styles.msgText, isMe && {color:'#fff'}]}>{item.text}</Text>
                            </View>
                        );
                    }}
                    contentContainerStyle={{paddingBottom: 20}}
                />
                <View style={styles.chatInputBar}>
                    <TextInput 
                        style={styles.chatInput} 
                        placeholder="Type a message..." 
                        value={inputText}
                        onChangeText={setInputText}
                    />
                    <TouchableOpacity onPress={sendMessage}>
                        <Ionicons name="send" size={24} color="#4F46E5" />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const FeedScreen = ({ posts, user, onRefresh, onPost, onLike, onComment }) => {
  const [text, setText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [activePostId, setActivePostId] = useState(null); 
  const [replyingTo, setReplyingTo] = useState(null); 
  
  return (
    <KeyboardAvoidingView 
        style={{flex:1}} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
        <View style={styles.screenContainer}>
        <View style={styles.postComposer}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
            <Avatar size={40} />
            <TextInput 
                style={styles.composeInput} 
                placeholder="Share a job, tip, or update..." 
                value={text}
                onChangeText={setText}
                multiline
            />
            </View>
            {text.length > 0 && (
            <TouchableOpacity style={styles.postBtn} onPress={() => { onPost(text); setText(''); }}>
                <Text style={styles.postBtnText}>Post</Text>
            </TouchableOpacity>
            )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
            {posts.length === 0 && (
            <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No posts yet.</Text>
            </View>
            )}
            {posts.map((post, index) => {
                const isLiked = post.likedBy && post.likedBy.includes(user.uid);
                return (
                <View key={index} style={styles.postCard}>
                <View style={styles.postHeader}>
                    <Avatar size={40} />
                    <View style={{marginLeft: 10}}>
                    <Text style={styles.postAuthor}>{post.author}</Text>
                    <Text style={styles.postRole}>{post.authorRole} • {post.authorCompany}</Text>
                    </View>
                    <Text style={styles.postDate}>{post.date}</Text>
                </View>
                <Text style={styles.postContent}>{post.content}</Text>
                
                {/* NESTED COMMENTS */}
                {post.comments && post.comments.length > 0 && (
                    <View style={styles.commentSection}>
                        {post.comments.map((c) => (
                            <View key={c.id} style={{marginBottom: 8}}>
                                <TouchableOpacity onLongPress={() => { setActivePostId(post.id); setReplyingTo({id: c.id, user: c.user}); }}>
                                    <Text style={styles.commentText}>
                                        <Text style={{fontWeight: 'bold'}}>{c.user} 
                                        {c.role === 'Alumni' && <Text style={{color: '#4F46E5', fontSize: 10}}> ✓</Text>}
                                        : </Text>
                                        {c.text}
                                    </Text>
                                </TouchableOpacity>
                                {/* Replies - Indented and Styled */}
                                {c.replies && c.replies.map(r => (
                                    <View key={r.id} style={styles.replyContainer}>
                                        <Text style={styles.replyText}>
                                            <Text style={{fontWeight: 'bold'}}>{r.user}
                                            {r.role === 'Alumni' && <Text style={{color: '#4F46E5', fontSize: 10}}> ✓</Text>}
                                            : </Text> 
                                            {r.text}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.postActions}>
                    <TouchableOpacity style={styles.actionItem} onPress={() => onLike(post)}>
                    <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? "#EF4444" : "#6B7280"} />
                    <Text style={[styles.actionText, isLiked && {color: '#EF4444'}]}>{post.likedBy?.length || 0} Likes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={() => { setActivePostId(activePostId === post.id ? null : post.id); setReplyingTo(null); }}>
                    <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
                    <Text style={styles.actionText}>Comment</Text>
                    </TouchableOpacity>
                </View>

                {activePostId === post.id && (
                    <View style={{marginTop: 10}}>
                        {replyingTo && <Text style={{fontSize:10, color:'#666', marginBottom:2}}>Replying to {replyingTo.user}...</Text>}
                        <View style={{flexDirection: 'row'}}>
                            <TextInput 
                                style={[styles.input, {flex: 1, marginBottom: 0, paddingVertical: 8}]} 
                                placeholder={replyingTo ? "Write a reply..." : "Write a comment..."} 
                                value={commentText}
                                onChangeText={setCommentText}
                            />
                            <TouchableOpacity 
                                style={{justifyContent: 'center', marginLeft: 10}}
                                onPress={() => { 
                                    onComment(post.id, commentText, replyingTo?.id); 
                                    setCommentText(''); 
                                    setActivePostId(null); 
                                    setReplyingTo(null);
                                }}
                            >
                                <Text style={{color: '#4F46E5', fontWeight: 'bold'}}>Send</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                </View>
            );
            })}
        </ScrollView>
        </View>
    </KeyboardAvoidingView>
  );
};

const MentorsScreen = ({ alumni, onSelect, onRefresh }) => {
  const [search, setSearch] = useState('');
  
  const filtered = alumni.filter(a => {
    const s = search.toLowerCase();
    return (a.name||'').toLowerCase().includes(s) || (a.company||'').toLowerCase().includes(s);
  });

  return (
    <View style={styles.screenContainer}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput style={styles.searchInput} placeholder="Search mentors..." value={search} onChangeText={setSearch} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
        {filtered.map(alum => (
          <TouchableOpacity key={alum.id} style={styles.mentorCard} onPress={() => onSelect(alum)}>
            <View style={{flexDirection:'row'}}>
              <Avatar size={60} />
              <View style={{marginLeft: 15, flex: 1}}>
                <Text style={styles.mentorName}>{alum.name}</Text>
                <Text style={styles.mentorRole}>{alum.role} at {alum.company}</Text>
                <View style={{flexDirection: 'row', marginTop: 6, gap: 5}}>
                  <View style={styles.statBadge}><Ionicons name="star" size={10} color="#F59E0B" /><Text style={styles.statText}>{alum.stats?.rating || 0.0}</Text></View>
                  <View style={styles.statBadge}><Text style={styles.statText}>{alum.stats?.experience || 0} Yr Exp</Text></View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const DetailScreen = ({ alum, currentUserUid, onBack, onConnect, onRate }) => {
  const [message, setMessage] = useState('');
  const [showRating, setShowRating] = useState(false);
  const isSelf = alum.uid === currentUserUid;
  const stats = alum.stats || { rating: 0.0, sessions: 0, experience: 0 };

  return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{flex:1}}
    >
        <View style={styles.screenContainer}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={{paddingBottom: 40}}>
            <View style={styles.detailHeader}>
            <Avatar size={100} />
            <Text style={styles.detailName}>{alum.name}</Text>
            <Text style={styles.detailInfo}>{alum.role} @ {alum.company}</Text>
            <View style={styles.statsRow}>
                <View style={styles.statItem}><Text style={styles.statVal}>{stats.rating}</Text><Text style={styles.statLabel}>Rating</Text></View>
                <View style={styles.statItem}><Text style={styles.statVal}>{stats.sessions}</Text><Text style={styles.statLabel}>Sessions</Text></View>
                <View style={styles.statItem}><Text style={styles.statVal}>{stats.experience}yr</Text><Text style={styles.statLabel}>Exp</Text></View>
            </View>
            </View>

            <View style={styles.detailSection}>
            <Text style={styles.sectionHeader}>About</Text>
            <Text style={styles.sectionText}>{alum.bio || "No bio available."}</Text>
            </View>

            {!isSelf && (
            <View style={styles.detailSection}>
                <Text style={styles.sectionHeader}>Request Session</Text>
                <TextInput style={styles.msgInput} placeholder="Why do you want to connect?" multiline value={message} onChangeText={setMessage} />
                <TouchableOpacity style={styles.primaryButton} onPress={() => onConnect(alum, message)}>
                <Text style={styles.buttonText}>Send Request</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowRating(true)}>
                <Text style={styles.secondaryBtnText}>Rate Mentor</Text>
                </TouchableOpacity>
            </View>
            )}
        </ScrollView>

        <Modal visible={showRating} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Rate {alum.name}</Text>
                    <View style={{flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20}}>
                        {[1, 2, 3, 4, 5].map(star => (
                            <TouchableOpacity key={star} onPress={() => { onRate(alum, star); setShowRating(false); }}>
                                <Ionicons name="star" size={32} color="#F59E0B" />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity onPress={() => setShowRating(false)}><Text style={{textAlign:'center', color:'gray'}}>Cancel</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>
        </View>
    </KeyboardAvoidingView>
  );
};

const ProfileScreen = ({ user, onLogout, onEdit }) => {
  const handleShare = async () => {
    try { await Share.share({ message: `Check out ${user.name}'s profile on Alumni Connect!` }); } catch (error) { alert(error.message); }
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.profileHeader}>
        <Avatar size={90} />
        <Text style={styles.profileName}>{user.name}</Text>
        <Text style={styles.profileRole}>{user.role} {user.company !== 'N/A' && `• ${user.company}`}</Text>
        
        <View style={styles.badgeContainer}>
            {user.role === 'Alumni' ? (
                <View style={[styles.badgePill, {backgroundColor: '#DBEAFE'}]}>
                    <MaterialIcons name="verified" size={14} color="#2563EB" />
                    <Text style={[styles.badgeText, {color: '#2563EB'}]}> Verified Alumni</Text>
                </View>
            ) : (
                <View style={[styles.badgePill, {backgroundColor: '#FEF3C7'}]}>
                    <FontAwesome5 name="seedling" size={12} color="#D97706" />
                    <Text style={[styles.badgeText, {color: '#D97706'}]}> Rising Star</Text>
                </View>
            )}
        </View>

        <View style={{flexDirection:'row', gap: 10, marginTop: 15}}>
          <TouchableOpacity style={styles.smallBtnOutline} onPress={onEdit}><Text style={{color:'#4F46E5'}}>Edit</Text></TouchableOpacity>
          <TouchableOpacity style={styles.smallBtnOutline} onPress={handleShare}><Text style={{color:'#4F46E5'}}>Share</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem} onPress={onEdit}>
          <Ionicons name="settings-outline" size={22} color="#4B5563" />
          <Text style={styles.menuText}>Settings & Profile</Text>
          <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={[styles.menuText, {color: '#EF4444'}]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EditProfileScreen = ({ user, onCancel, onSave }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState(user.bio);
  const [company, setCompany] = useState(user.company);
  
  return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{flex:1}}
    >
        <View style={styles.screenContainer}>
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={onCancel}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{width:24}}/>
        </View>
        <ScrollView>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />
            <Text style={styles.label}>Bio</Text>
            <TextInput style={styles.input} value={bio} onChangeText={setBio} multiline />
            {user.role === 'Alumni' && (
                <>
                    <Text style={styles.label}>Company</Text>
                    <TextInput style={styles.input} value={company} onChangeText={setCompany} />
                </>
            )}
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" />
            <Text style={styles.label}>New Password</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Leave empty to keep current" secureTextEntry />
            <TouchableOpacity style={styles.primaryButton} onPress={() => onSave(name, email, password, bio, company)}>
            <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>
        </ScrollView>
        </View>
    </KeyboardAvoidingView>
  );
};

const RequestsScreen = ({ requests, isAlumni, onAction, onChat, onRefresh }) => (
  <View style={styles.screenContainer}>
    <TouchableOpacity onPress={onRefresh} style={{alignSelf: 'flex-end', marginBottom: 10}}>
      <Text style={{color: '#4F46E5'}}>Refresh</Text>
    </TouchableOpacity>
    <ScrollView>
      {requests.length === 0 ? (
        <View style={styles.emptyState}><Text style={styles.emptyText}>No requests yet.</Text></View>
      ) : (
        requests.map((req, idx) => (
          <View key={idx} style={styles.reqCard}>
            <View style={[styles.reqStrip, {backgroundColor: req.status === 'Accepted' ? '#10B981' : '#F59E0B'}]} />
            <View style={{padding: 15}}>
              <Text style={styles.reqHeader}>{isAlumni ? req.senderName : `To: ${req.mentorName}`}</Text>
              <Text style={styles.reqDate}>{req.date}</Text>
              <Text style={styles.reqMsg}>{req.message}</Text>
              
              {/* ACCEPTED VIEW - CHAT BUTTON */}
              {req.status === 'Accepted' && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, {backgroundColor: '#4F46E5', marginTop: 10}]}
                    onPress={() => onChat(req)}
                  >
                      <Text style={{color: '#fff', fontWeight: 'bold'}}>💬 Chat Now</Text>
                  </TouchableOpacity>
              )}

              {isAlumni && req.status === 'Pending' && (
                <View style={styles.reqActions}>
                  <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#EF4444'}]} onPress={() => onAction(req.id, 'Rejected')}><Text style={{color:'#fff'}}>Reject</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#10B981'}]} onPress={() => onAction(req.id, 'Accepted')}><Text style={{color:'#fff'}}>Accept</Text></TouchableOpacity>
                </View>
              )}
              
              {req.status !== 'Pending' && req.status !== 'Accepted' && (
                  <Text style={{marginTop:5, fontWeight:'bold', color: '#EF4444'}}>{req.status.toUpperCase()}</Text>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  </View>
);

const OnboardingScreen = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Student');
  const [bio, setBio] = useState('');
  const [company, setCompany] = useState('');
  const [exp, setExp] = useState('');
  const [batch, setBatch] = useState('');

  return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{flex:1}}
    >
        <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center', padding: 20}}>
        <View style={styles.authCard}>
            <Text style={styles.authTitle}>Profile Setup</Text>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />
            <View style={{flexDirection:'row', gap:10, marginBottom:15}}>
            {['Student', 'Alumni'].map(r => (
                <TouchableOpacity key={r} style={[styles.roleBtn, role === r && styles.roleBtnActive]} onPress={() => setRole(r)}>
                <Text style={[styles.roleText, role === r && {color: '#4F46E5'}]}>{r}</Text>
                </TouchableOpacity>
            ))}
            </View>
            <Text style={styles.label}>{role === 'Student' ? 'University' : 'Current Company'}</Text>
            <TextInput style={styles.input} value={company} onChangeText={setCompany} />
            {role === 'Alumni' && (
            <>
                <Text style={styles.label}>Years of Experience</Text>
                <TextInput style={styles.input} value={exp} onChangeText={setExp} keyboardType="numeric" />
            </>
            )}
            <Text style={styles.label}>Batch Year</Text>
            <TextInput style={styles.input} value={batch} onChangeText={setBatch} keyboardType="numeric" placeholder="e.g. 2023" />
            <Text style={styles.label}>Bio</Text>
            <TextInput style={styles.input} value={bio} onChangeText={setBio} multiline numberOfLines={3} />
            <TouchableOpacity style={styles.primaryButton} onPress={() => onComplete(name, role, bio, company, exp, batch)}>
            <Text style={styles.buttonText}>Complete</Text>
            </TouchableOpacity>
        </View>
        </ScrollView>
    </KeyboardAvoidingView>
  );
};

const AuthScreen = ({ isLogin, onToggle, onLogin, onSignup, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1, justifyContent:'center', padding: 20}}>
      <View style={styles.authCard}>
        <View style={{alignItems:'center', marginBottom:20}}>
          <FontAwesome5 name="graduation-cap" size={40} color="#4F46E5" />
          <Text style={styles.authTitle}>Alumni Connect</Text>
        </View>
        <TextInput placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput placeholder="Password" style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />
        <TouchableOpacity style={styles.primaryButton} onPress={() => isLogin ? onLogin(email, password) : onSignup(email, password)} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isLogin ? 'Log In' : 'Sign Up'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggle} style={{marginTop:20, alignItems:'center'}}>
          <Text style={{color:'#4F46E5'}}>{isLogin ? "New? Create Account" : "Have account? Log In"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const SplashScreen = () => (
  <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#fff'}}>
    <View style={{width:100, height:100, borderRadius:25, backgroundColor:'#4F46E5', alignItems:'center', justifyContent:'center', marginBottom:20}}>
      <FontAwesome5 name="graduation-cap" size={50} color="#fff" />
    </View>
    <Text style={{fontSize:24, fontWeight:'bold', color:'#1F2937'}}>Alumni Connect</Text>
    <ActivityIndicator size="small" color="#4F46E5" style={{marginTop:30}} />
  </View>
);

const Avatar = ({ size }) => (
  <View style={{width: size, height: size, borderRadius: size/2, backgroundColor:'#E0E7FF', alignItems:'center', justifyContent:'center'}}>
    <FontAwesome5 name="user-alt" size={size*0.4} color="#4F46E5" />
  </View>
);

const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity onPress={onPress} style={{alignItems:'center', flex:1}}>
    <MaterialIcons name={icon} size={24} color={active ? '#4F46E5' : '#9CA3AF'} />
    <Text style={{fontSize:10, color: active ? '#4F46E5' : '#9CA3AF', marginTop:4}}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  mainSafeArea: { flex: 1, backgroundColor: '#fff', paddingTop: StatusBar.currentHeight || 0 },
  webBackground: { flex: 1, backgroundColor: '#F3F4F6', alignItems: 'center' },
  webContainer: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: '#fff' },
  contentArea: { flex: 1, paddingHorizontal: 20, paddingBottom: 100 }, 
  
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111' },
  
  // Feed
  postComposer: { backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB', shadowColor:'#000', shadowOpacity:0.05, elevation:2 },
  composeInput: { flex: 1, marginLeft: 10, fontSize: 16, maxHeight: 100 },
  postBtn: { alignSelf: 'flex-end', backgroundColor: '#4F46E5', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginTop: 10 },
  postBtnText: { color: '#fff', fontWeight: 'bold' },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  postCard: { backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#F3F4F6' },
  postHeader: { flexDirection: 'row', marginBottom: 10 },
  postAuthor: { fontWeight: 'bold' },
  postRole: { fontSize: 12, color: '#6B7280' },
  postDate: { marginLeft: 'auto', fontSize: 12, color: '#9CA3AF' },
  postContent: { fontSize: 15, marginBottom: 15, lineHeight: 22 },
  postActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  actionItem: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  actionText: { color: '#6B7280' },
  commentSection: { backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, marginBottom: 10 },
  commentText: { fontSize: 12, color: '#4B5563', marginBottom: 4 },
  
  // FIX: Reply Styles
  replyContainer: { marginLeft: 15, marginTop: 5, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#E5E7EB' },
  replyText: { fontSize: 12, color: '#666' },

  // Directory & Search
  searchBox: { flexDirection: 'row', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginBottom: 15 },
  searchInput: { flex: 1, marginLeft: 10 },
  mentorCard: { backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  mentorName: { fontSize: 17, fontWeight: 'bold' },
  mentorRole: { color: '#6B7280' },
  statBadge: { flexDirection: 'row', backgroundColor: '#EEF2FF', padding: 5, borderRadius: 5, alignItems: 'center' },
  statText: { fontSize: 11, color: '#4F46E5', marginLeft: 3, fontWeight: 'bold' },

  // Profile
  profileHeader: { alignItems: 'center', marginVertical: 20 },
  profileName: { fontSize: 22, fontWeight: 'bold', marginTop: 10 },
  profileRole: { color: '#6B7280' },
  smallBtnOutline: { borderWidth: 1, borderColor: '#4F46E5', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  menuContainer: { backgroundColor: '#fff', borderRadius: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuText: { flex: 1, marginLeft: 15, fontSize: 16 },
  badgeContainer: { flexDirection: 'row', gap: 10, marginTop: 10 },
  badgePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: 'bold', marginLeft: 5 },

  // Detail
  backButton: { marginBottom: 10 },
  detailHeader: { alignItems: 'center', marginBottom: 20 },
  detailName: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  detailInfo: { color: '#6B7280' },
  statsRow: { flexDirection: 'row', gap: 15, marginTop: 15 },
  statItem: { backgroundColor: '#F9FAFB', padding: 10, borderRadius: 10, alignItems: 'center', minWidth: 70 },
  statVal: { fontWeight: 'bold', fontSize: 16 },
  statLabel: { fontSize: 11, color: '#6B7280' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  sectionText: { fontSize: 16, lineHeight: 24, color: '#4B5563', marginBottom: 20 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  modeChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth:1, borderColor:'#E5E7EB' },
  modeChipActive: { backgroundColor: '#4F46E5', borderColor:'#4F46E5' },
  modeText: { fontWeight: '600', color: '#4B5563' },
  msgInput: { backgroundColor: '#F9FAFB', padding: 15, borderRadius: 12, height: 100, textAlignVertical: 'top', marginBottom: 15 },
  secondaryButton: { marginTop: 10, padding: 15, alignItems: 'center' },
  secondaryBtnText: { color: '#4F46E5', fontWeight: 'bold' },

  // Auth
  authCard: { backgroundColor: '#fff', padding: 25, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, elevation: 5 },
  authTitle: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  input: { backgroundColor: '#F9FAFB', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#E5E7EB' },
  primaryButton: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', width: '100%' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  roleBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  roleBtnActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  roleText: { fontWeight: '600', color: '#6B7280' },
  label: { fontWeight: '600', marginBottom: 5 },

  // Requests
  reqCard: { backgroundColor: '#fff', borderRadius: 15, marginBottom: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  reqStrip: { width: 6, height: '100%', position: 'absolute' },
  reqHeader: { fontWeight: 'bold', fontSize: 16 },
  reqDate: { fontSize: 12, color: '#9CA3AF', marginBottom: 5 },
  reqMsg: { fontStyle: 'italic', color: '#4B5563' },
  reqActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold' },

  // Chat
  chatInputBar: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  chatInput: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20, padding: 10, marginRight: 10 },
  msgBubble: { padding: 10, borderRadius: 15, marginBottom: 10, maxWidth: '80%' },
  
  // FIX: Distinct Chat Colors and Alignment
  msgMe: { backgroundColor: '#4F46E5', alignSelf: 'flex-end' }, // Blue, Right
  msgOther: { backgroundColor: '#E5E7EB', alignSelf: 'flex-start' }, // Gray, Left
  
  msgText: { fontSize: 16 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 15, width: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },

  // Common
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  screenContainer: { flex: 1, paddingTop: 20 },
  
  // Bottom Nav (Fixed Padding)
  bottomNavWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10, paddingBottom: 40, height: 90 },
});