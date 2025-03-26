import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:flutter/gestures.dart';
import 'package:webview_flutter_platform_interface/webview_flutter_platform_interface.dart';

class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> with SingleTickerProviderStateMixin {
  late WebViewController _controller;
  bool isLoading = true;
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: Duration(seconds: 1),
    )..repeat(reverse: true);
    _initWebView();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF000000))
      ..enableZoom(false)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            setState(() {
              isLoading = true;
            });
          },
          onPageFinished: (String url) {
            setState(() {
              isLoading = false;
            });
            // Staggered script injection
            [100, 500, 1000].forEach((delay) {
              Future.delayed(Duration(milliseconds: delay), _injectChatScript);
            });
          },
          onWebResourceError: (WebResourceError error) {
            print('WebView error: ${error.description}');
            Future.delayed(Duration(seconds: 1), _injectChatScript);
          },
        ),
      )
      ..loadHtmlString(_getChatHtml());
  }

  void _injectChatScript() {
    _controller.runJavaScript('''
      function initializeChat() {
        // First, ensure any existing styles are removed
        const existingStyle = document.getElementById('chat-custom-styles');
        if (existingStyle) existingStyle.remove();

        var style = document.createElement('style');
        style.id = 'chat-custom-styles';
        style.textContent = `
          body {
            background-color: #000000 !important;
          }
          .welcome-overlay {
            width: 90% !important;
            max-width: 400px !important;
            position: fixed;
            top: 20px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: linear-gradient(180deg, #000000, #000000) !important;
            padding: 24px !important;
            border-radius: 16px !important;
            text-align: center;
            z-index: 10000;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 20px !important;
          }
          .welcome-icon {
            font-size: 48px;
            animation: bounce 2s infinite;
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .welcome-title {
            color: #60A5FA;
            font-size: 24px;
            font-weight: bold;
            margin: 0;
          }
          .welcome-description {
            color: #e0e0e0;
            font-size: 16px;
            margin: 0;
            line-height: 1.5;
          }
          .welcome-tips {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 16px;
            margin: 8px 0;
            text-align: left;
          }
          .tip-item {
            color: #a0aec0;
            font-size: 14px;
            margin: 8px 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .chatbase-iframe-container { 
            height: calc(100vh - 100px) !important;
            margin-bottom: 0 !important;
            padding-top: 220px !important;
            background-color: #000000 !important;
            position: relative !important;
          }
          .chatbase-iframe {
            height: calc(100vh - 100px) !important;
            background-color: #000000 !important;
          }
          .chatbase-box {
            background-color: #000000 !important;
            position: relative !important;
          }
          /* Maximum specificity for button styles */
          .chatbase-bubble-button.chatbase-bubble-button.chatbase-bubble-button.chatbase-bubble-button {
            bottom: 300px !important;
            position: fixed !important;
            z-index: 10001 !important;
            opacity: 0.9 !important;
            transition: all 0.3s ease !important;
            background-color: #60A5FA !important;
            transform: none !important;
            right: 20px !important;
            left: auto !important;
            margin: 0 !important;
            padding: 12px !important;
            border-radius: 50% !important;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2) !important;
          }

          @keyframes pulse {
            0% { transform: scale(1) !important; }
            50% { transform: scale(1.05) !important; }
            100% { transform: scale(1) !important; }
          }
          .chatbase-bubble-button:hover {
            animation: pulse 1s infinite !important;
          }
          .chatbase-branding-container { display: none !important; }
          .chatbase-powered-by { display: none !important; }
          .chatbase-close-button { display: none !important; }
          .close-button { display: none !important; }
          button[aria-label="Close chat"] { display: none !important; }
        `;
        document.head.appendChild(style);

        // Create and insert welcome message
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-overlay';
        welcomeDiv.innerHTML = `
          <div class="welcome-icon">🤖</div>
          <div class="welcome-title">Welcome to the Chat Assistant!</div>
          <div class="welcome-description">
            Your AI helper is ready to assist you with any questions.
          </div>
          <div class="welcome-tips">
            <div class="tip-item">
              <span>💡</span> Ask about product details
            </div>
            <div class="tip-item">
              <span>🎯</span> Get personalized recommendations
            </div>
            <div class="tip-item">
              <span>🔧</span> Get help with troubleshooting
            </div>
          </div>
        `;
        document.body.appendChild(welcomeDiv);

        // Super aggressive style enforcement with position locking
        function enforceStyles() {
          document.querySelectorAll('.chatbase-bubble-button').forEach(btn => {
            const styles = {
              'bottom': '300px',
              'position': 'fixed',
              'z-index': '10001',
              'background-color': '#60A5FA',
              'opacity': '0.9',
              'transition': 'all 0.3s ease',
              'transform': 'none',
              'right': '20px',
              'left': 'auto',
              'margin': '0',
              'padding': '12px',
              'border-radius': '50%',
              'box-shadow': '0 2px 12px rgba(0, 0, 0, 0.2)'
            };
            
            Object.entries(styles).forEach(([prop, value]) => {
              btn.style.setProperty(prop, value, 'important');
            });
            
            // Force reflow
            void btn.offsetHeight;
          });
        }

        // Immediate enforcement
        enforceStyles();

        // Rapid initial enforcements
        [50, 100, 200, 300, 500, 1000, 2000, 3000].forEach(ms => {
          setTimeout(enforceStyles, ms);
        });
        
        // Continuous monitoring
        setInterval(enforceStyles, 1000);

        // Enhanced mutation observer
        new MutationObserver((mutations) => {
          if (mutations.some(m => 
            m.type === 'attributes' || 
            m.type === 'childList' ||
            (m.type === 'characterData' && m.target.parentNode === document.body)
          )) {
            enforceStyles();
          }
        }).observe(document.body, {
          subtree: true,
          childList: true,
          attributes: true,
          characterData: true,
          attributeFilter: ['style', 'class', 'id', 'position']
        });
      }

      // Ensure initialization happens at the right time
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeChat);
      } else {
        initializeChat();
      }
    ''');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        elevation: 0,
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (isLoading)
            Container(
              color: Colors.black,
              child: Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF60A5FA)),
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _getChatHtml() {
    return '''
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            background-color: #000000;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          #chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            height: 100vh;
            position: relative;
          }
        </style>
      </head>
      <body>
        <div id="chat-container">
          <script>
            (function(){
              if(!window.chatbase||window.chatbase("getState")!=="initialized"){
                window.chatbase=(...arguments)=>{
                  if(!window.chatbase.q){window.chatbase.q=[]}
                  window.chatbase.q.push(arguments)
                };
                window.chatbase=new Proxy(window.chatbase,{
                  get(target,prop){
                    if(prop==="q"){return target.q}
                    return(...args)=>target(prop,...args)
                  }
                })
              }
              const onLoad=function(){
                const script=document.createElement("script");
                script.src="https://www.chatbase.co/embed.min.js";
                script.id="ujuv79Iz63Mlw8j1i88b0";
                script.domain="www.chatbase.co";
                document.body.appendChild(script);
              };
              if(document.readyState==="complete"){
                onLoad()
              }else{
                window.addEventListener("load",onLoad)
              }
            })();
          </script>
          <div 
            class="chatbase-box" 
            data-token="fqgjbht82ajojrapsm59gfcgye10h70n"
            data-auto-open="true"
            data-hide-bubble-button="true"
          ></div>
        </div>
      </body>
      </html>
    ''';
  }
}