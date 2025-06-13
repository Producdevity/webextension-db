//
//  SafariWebExtensionHandler.swift
//  WebExtensionDB Safari Example
//
//  Handles communication between Safari extension and native app
//

import SafariServices
import os.log

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    
    func beginRequest(with context: NSExtensionContext) {
        let response = NSExtensionItem()
        
        guard let inputItem = context.inputItems.first as? NSExtensionItem,
              let message = inputItem.userInfo?["message"] as? [String: Any] else {
            os_log(.error, "Failed to get message from extension")
            context.completeRequest(returningItems: [], completionHandler: nil)
            return
        }
        
        os_log(.default, "Received message from extension: %@", String(describing: message))
        
        // Handle different message types
        if let messageType = message["type"] as? String {
            switch messageType {
            case "storage-request":
                handleStorageRequest(message: message, context: context)
            case "permissions-request":
                handlePermissionsRequest(message: message, context: context)
            default:
                os_log(.error, "Unknown message type: %@", messageType)
                context.completeRequest(returningItems: [], completionHandler: nil)
            }
        } else {
            context.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
    
    private func handleStorageRequest(message: [String: Any], context: NSExtensionContext) {
        // Handle storage operations that might need native app support
        let response = NSExtensionItem()
        response.userInfo = [
            "type": "storage-response",
            "status": "success",
            "data": message
        ]
        
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
    
    private func handlePermissionsRequest(message: [String: Any], context: NSExtensionContext) {
        // Handle permission requests
        let response = NSExtensionItem()
        response.userInfo = [
            "type": "permissions-response",
            "granted": true
        ]
        
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
} 