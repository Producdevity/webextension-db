//
//  ContentView.swift
//  WebExtensionDB Safari Example
//
//  Main app interface for the Safari Extension
//

import SwiftUI
import SafariServices

struct ContentView: View {
    @State private var extensionEnabled = false
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "externaldrive.connected.to.line.below")
                .font(.system(size: 60))
                .foregroundColor(.blue)
            
            Text("WebExtensionDB Safari Example")
                .font(.title)
                .fontWeight(.bold)
            
            Text("A unified database API for Safari web extensions")
                .font(.subtitle)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Divider()
            
            VStack(alignment: .leading, spacing: 10) {
                Label("Cross-browser compatibility", systemImage: "checkmark.circle.fill")
                    .foregroundColor(.green)
                
                Label("Automatic storage backend detection", systemImage: "checkmark.circle.fill")
                    .foregroundColor(.green)
                
                Label("SQLite, IndexedDB, and browser.storage support", systemImage: "checkmark.circle.fill")
                    .foregroundColor(.green)
                
                Label("TypeScript support with full type safety", systemImage: "checkmark.circle.fill")
                    .foregroundColor(.green)
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(10)
            
            Divider()
            
            VStack(spacing: 15) {
                Text("To use this extension:")
                    .font(.headline)
                
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("1.")
                            .fontWeight(.bold)
                            .frame(width: 20, alignment: .leading)
                        Text("Open Safari Preferences")
                    }
                    
                    HStack {
                        Text("2.")
                            .fontWeight(.bold)
                            .frame(width: 20, alignment: .leading)
                        Text("Go to Extensions tab")
                    }
                    
                    HStack {
                        Text("3.")
                            .fontWeight(.bold)
                            .frame(width: 20, alignment: .leading)
                        Text("Enable WebExtensionDB Extension")
                    }
                    
                    HStack {
                        Text("4.")
                            .fontWeight(.bold)
                            .frame(width: 20, alignment: .leading)
                        Text("Click the extension icon in Safari's toolbar")
                    }
                }
                .padding(.horizontal)
            }
            
            Button(action: openSafariExtensionPreferences) {
                Label("Open Safari Extension Preferences", systemImage: "safari")
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
            
            Spacer()
            
            Text("Version 1.0.0")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: 500)
        .onAppear {
            checkExtensionStatus()
        }
    }
    
    private func openSafariExtensionPreferences() {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: "com.webextensiondb.safari.example.Extension") { error in
            if let error = error {
                print("Error opening Safari Extension preferences: \(error.localizedDescription)")
            }
        }
    }
    
    private func checkExtensionStatus() {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: "com.webextensiondb.safari.example.Extension") { state, error in
            if let state = state {
                DispatchQueue.main.async {
                    self.extensionEnabled = state.isEnabled
                }
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
} 