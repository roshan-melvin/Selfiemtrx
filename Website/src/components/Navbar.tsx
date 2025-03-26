{user && (
  <div className="flex items-center space-x-4">
    <span className="text-white font-medium">{user.email}</span>
    {user.photoURL ? (
      <img
        src={user.photoURL}
        alt="Profile"
        className="w-8 h-8 rounded-full border border-gray-500"
        referrerPolicy="no-referrer"
      />
    ) : (
      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
        <span className="text-gray-600 text-sm">
          {user.email?.[0].toUpperCase()}
        </span>
      </div>
    )}
    <button
      onClick={handleSignOut}
      className="text-white hover:text-gray-300 transition-colors"
    >
      Sign Out
    </button>
  </div>
)} 