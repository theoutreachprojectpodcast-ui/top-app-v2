import Capacitor
import UIKit

/// Forces portrait-only rotation for the Capacitor WebView shell.
class MainViewController: CAPBridgeViewController {
    override open var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        .portrait
    }

    override open var preferredInterfaceOrientationForPresentation: UIInterfaceOrientation {
        .portrait
    }

    override open var shouldAutorotate: Bool {
        false
    }
}
