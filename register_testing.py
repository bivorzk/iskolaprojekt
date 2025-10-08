import pyautogui
import time
import random
import webbrowser


def register(username, email, password):

    if not webbrowser.open("http://localhost:3000/register"):
        return
  
 #   if pyautogui.getActiveWindowTitle() != "Google Chrome":
  #      return  
    
    else:
        time.sleep(2)
        pyautogui.write(username, interval=random.uniform(0.1, 0.3))
        pyautogui.press("tab")
        pyautogui.write(email, interval=random.uniform(0.1, 0.3))
        pyautogui.press("tab")
        pyautogui.write(password, interval=random.uniform(0.1, 0.3))
        pyautogui.press("tab")
        pyautogui.write(password, interval=random.uniform(0.1, 0.3))
        pyautogui.press("enter")

register("testuser", "testuser@example.com", "password123")
