# save as register_selenium.py
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import random

# Configuration
BASE_URL = "http://localhost:3000/register"
REG_COUNT = 50
BASE_USERNAME = "testuser"
PASSWORD = "S-b%%W_TgGM7NR"
MIN_DELAY = 0.5
MAX_DELAY = 1.5
IMPLICIT_WAIT = 5  # seconds

# Adjust these selectors to match your form
SELECTORS = {
    "username": (By.NAME, "username"),          # e.g. <input name="username">
    "email":    (By.NAME, "email"),
    "password": (By.NAME, "password"),
    "confirm":  (By.NAME, "confirmPassword"),  # <-- FIXED: use actual name attribute
    "submit":   (By.CSS_SELECTOR, "button[type='submit']"),
}

def make_username_email(base, i):
    ts = int(time.time() % 100000)
    username = f"{base}{i}_{ts}"
    email = f"{base}{i}_{ts}@example.com"
    return username, email

def create_driver(headless=False):
    options = Options()
    if headless:
        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
    # optional: set window-size for consistent behavior
    options.add_argument("--window-size=1200,800")
    driver = webdriver.Chrome(options=options)  # ensure chromedriver is in PATH
    driver.implicitly_wait(IMPLICIT_WAIT)
    return driver

def register_once(driver, username, email, password):
    driver.get(BASE_URL)

    wait = WebDriverWait(driver, 8)

    # Wait for username field to be present
    u_by, u_sel = SELECTORS["username"]
    e_by, e_sel = SELECTORS["email"]
    p_by, p_sel = SELECTORS["password"]
    c_by, c_sel = SELECTORS["confirm"]
    s_by, s_sel = SELECTORS["submit"]

    wait.until(EC.presence_of_element_located((u_by, u_sel)))
    # Fill fields
    driver.find_element(u_by, u_sel).clear()
    driver.find_element(u_by, u_sel).send_keys(username)
    driver.find_element(e_by, e_sel).clear()
    driver.find_element(e_by, e_sel).send_keys(email)
    driver.find_element(p_by, p_sel).clear()
    driver.find_element(p_by, p_sel).send_keys(password)
    driver.find_element(c_by, c_sel).clear()
    driver.find_element(c_by, c_sel).send_keys(password)

    # Submit
    driver.find_element(s_by, s_sel).click()

    # Wait for a success confirmation or redirect - adapt condition to your app
    # Example: wait for URL change or an element with class 'success' to appear
    try:
        # Wait up to 6s for either a success element OR URL to change away from /register
        WebDriverWait(driver, 6).until(
            lambda d: ("/register" not in d.current_url) or d.find_elements(By.CSS_SELECTOR, ".success")
        )
    except Exception:
        # If the wait times out, we'll still continue; caller can inspect page
        pass

def main():
    driver = create_driver(headless=False)  # set headless=True if you don't need GUI
    successes = 0

    try:
        for i in range(1, REG_COUNT + 1):
            username, email = make_username_email(BASE_USERNAME, i)
            try:
                register_once(driver, username, email, PASSWORD)
                print(f"[{i}] Registered: {username} / {email}")
                successes += 1
            except Exception as e:
                print(f"[{i}] FAILED {username}: {e}")
            time.sleep(random.uniform(MIN_DELAY, MAX_DELAY))
    finally:
        driver.quit()
        print(f"Finished: {successes}/{REG_COUNT} attempted successfully.")

if __name__ == "__main__":
    main()
